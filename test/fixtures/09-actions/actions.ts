import { actions, errors } from '@balena/pinejs';
import type ActionsUniversityModel from './actions-university.js';
import { assertExists } from '../../lib/common.js';
import './translations/v1/actions.js';

declare module '../../../out/sbvr-api/sbvr-utils.js' {
	export interface API {
		actionsUniversity: PinejsClient<ActionsUniversityModel>;
	}
}

actions.addAction(
	'actionsUniversity',
	'student',
	'promoteToNextSemester',
	async ({ id, api, request }) => {
		if (id == null) {
			throw new errors.BadRequestError(
				'Can only promote one student at a time',
			);
		}

		const { grades } = request.values;

		if (!Array.isArray(grades)) {
			throw new errors.BadRequestError('Invalid payload');
		}

		const average =
			grades.reduce((sum, grade) => sum + grade, 0) / grades.length;

		if (average < 7) {
			await api.patch({
				resource: 'student',
				id,
				body: {
					is_repeating: true,
					previous_year_grade: `${average}`,
				},
			});
		} else {
			const student = await api.get({
				resource: 'student',
				id,
				options: {
					$select: ['semester'],
				},
			});

			assertExists(student);

			await api.patch({
				resource: 'student',
				id,
				body: {
					semester: student.semester + 1,
					is_repeating: false,
					previous_year_grade: `${average}`,
				},
			});
		}

		if (request.values.dryRun) {
			throw new errors.UnprocessableEntityError('Dry run completed');
		}

		return {
			statusCode: 200,
		};
	},
);
