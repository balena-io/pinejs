import type express from 'express';
import { permissions, sbvrUtils } from '@balena/pinejs';

const buildReq = (
	permission: string,
	extraBinds?: sbvrUtils.ExtraBinds,
): { user: sbvrUtils.User } => ({
	user: {
		id: 1,
		actor: 1,
		permissions: [permission],
		extraBinds,
	},
});

const readStudents = (permission: string, extraBinds?: sbvrUtils.ExtraBinds) =>
	sbvrUtils.api.university.get({
		resource: 'student',
		passthrough: { req: buildReq(permission, extraBinds) },
		options: {
			$select: ['name', 'semester_credits', 'birthday'],
			$orderby: { matrix_number: 'asc' },
		},
	});

// Wraps a handler so the resolved value is returned as JSON and any error surfaces with
// the status code pinejs assigned it (eg a 400 for a missing/invalid bind), so the tests
// assert pinejs' own status rather than a hardcoded one.
const handle =
	(fn: (req: express.Request) => Promise<unknown>): express.RequestHandler =>
	async (req, res) => {
		try {
			res.status(200).json(await fn(req));
		} catch (err) {
			const status =
				err != null &&
				typeof err === 'object' &&
				'status' in err &&
				typeof err.status === 'number'
					? err.status
					: 500;
			res
				.status(status)
				.json({ error: err instanceof Error ? err.message : `${err}` });
		}
	};

const seedStudents = [
	{
		matrixNumber: 1,
		name: 'student-1',
		credits: 10,
		birthday: '2000-01-01T00:00:00.000Z',
	},
	{
		matrixNumber: 2,
		name: 'student-2',
		credits: 10,
		birthday: '2001-02-02T00:00:00.000Z',
	},
	{
		matrixNumber: 3,
		name: 'student-3',
		credits: 12,
		birthday: '2002-03-03T00:00:00.000Z',
	},
] as const;

export const initRoutes = (app: express.Express) => {
	// Seed a few students as root so the scoped reads below have something to match.
	app.post('/seed', async (_req, res) => {
		try {
			for (const student of seedStudents) {
				await sbvrUtils.api.university.post({
					resource: 'student',
					passthrough: { req: permissions.root },
					body: {
						matrix_number: student.matrixNumber,
						name: student.name,
						lastname: `lastname-${student.matrixNumber}`,
						birthday: new Date(student.birthday),
						semester_credits: student.credits,
					},
				});
			}
			res.sendStatus(201);
		} catch (err) {
			res
				.status(500)
				.json({ error: err instanceof Error ? err.message : `${err}` });
		}
	});

	// Real bind against the integer `semester_credits` column.
	app.get(
		'/by-credits',
		handle((req) =>
			readStudents('university.student.read?semester_credits eq @__CREDITS', {
				'@__CREDITS': `${Number(req.query.credits)}`,
			}),
		),
	);

	// Text bind against the text `name` column.
	app.get(
		'/by-name',
		handle((req) =>
			readStudents('university.student.read?name eq @__NAME', {
				'@__NAME': `'${req.query.name}'`,
			}),
		),
	);

	// Date bind against the date-time `birthday` column, using `gt` so the comparison is
	// chronological — this is what would silently break if bound as Text.
	app.get(
		'/born-after',
		handle((req) =>
			readStudents('university.student.read?birthday gt @__SINCE', {
				'@__SINCE': `datetime'${new Date(`${req.query.since}`).toISOString()}'`,
			}),
		),
	);

	// Multiple binds of mixed types resolved together in a single permission rule.
	app.get(
		'/combined',
		handle((req) =>
			readStudents(
				'university.student.read?semester_credits eq @__CREDITS and name eq @__NAME and birthday gt @__SINCE',
				{
					'@__CREDITS': `${Number(req.query.credits)}`,
					'@__NAME': `'${req.query.name}'`,
					'@__SINCE': `datetime'${new Date(`${req.query.since}`).toISOString()}'`,
				},
			),
		),
	);

	// A referenced bind that is not supplied must fail closed.
	app.get(
		'/missing-bind',
		handle(() =>
			readStudents(
				'university.student.read?semester_credits eq @__CREDITS',
				undefined,
			),
		),
	);

	// Overriding the reserved @__ACTOR_ID bind must be rejected.
	app.get(
		'/reserved',
		handle(() =>
			readStudents('university.student.read?semester_credits eq @__CREDITS', {
				'@__ACTOR_ID': '1',
				'@__CREDITS': '10',
			}),
		),
	);

	// A bind key that does not use the reserved @__ prefix must be rejected.
	app.get(
		'/unprefixed-bind',
		handle(() =>
			readStudents('university.student.read?semester_credits eq @CREDITS', {
				// Deliberately outside the @__ namespace to exercise the runtime guard.
				'@CREDITS': '10',
			} as sbvrUtils.ExtraBinds),
		),
	);
};
