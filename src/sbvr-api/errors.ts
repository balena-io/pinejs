import type { AnyObject, Tail } from './common-types';

import { TypedError } from 'typed-error';

export class PermissionError extends TypedError {}
export class PermissionParsingError extends TypedError {}

export class SqlCompilationError extends TypedError {}
export class SbvrValidationError extends TypedError {}

export class TranslationError extends TypedError {}
export class ParsingError extends TypedError {}

export class HttpError extends TypedError {
	constructor(
		public status: number,
		error: string | Error = '',
		public body?: string | AnyObject,
		public headers?: {
			[headerName: string]: any;
		},
	) {
		super(error);
	}

	public getResponseBody() {
		return this.body !== undefined ? this.body : this.message;
	}
}

type HttpErrorTailArgs = Tail<ConstructorParameters<typeof HttpError>>;

export class BadRequestError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(400, ...args);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(401, ...args);
	}
}

export class PaymentRequired extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(402, ...args);
	}
}

export class ForbiddenError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(403, ...args);
	}
}

export class NotFoundError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(404, ...args);
	}
}

export class MethodNotAllowedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(405, ...args);
	}
}

export class NotAcceptableError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(406, ...args);
	}
}

export class ProxyAuthenticationRequiredError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(407, ...args);
	}
}

export class RequestTimeoutError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(408, ...args);
	}
}

export class ConflictError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(409, ...args);
	}
}

export class GoneError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(410, ...args);
	}
}

export class LengthRequiredError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(411, ...args);
	}
}

export class PreconditionFailedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(412, ...args);
	}
}

export class PayloadTooLargeError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(413, ...args);
	}
}

export class URITooLongError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(414, ...args);
	}
}

export class UnsupportedMediaTypeError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(415, ...args);
	}
}

export class RequestedRangeNotSatisfiableError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(416, ...args);
	}
}

export class ExpectationFailedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(417, ...args);
	}
}

export class MisdirectedRequestError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(421, ...args);
	}
}

export class UnprocessableEntityError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(422, ...args);
	}
}

export class LockedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(423, ...args);
	}
}

export class FailedDependencyError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(424, ...args);
	}
}

export class UpgradeRequiredError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(426, ...args);
	}
}

export class PreconditionRequiredError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(428, ...args);
	}
}

export class TooManyRequestsError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(429, ...args);
	}
}

export class RequestHeaderFieldsTooLargeError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(431, ...args);
	}
}

export class UnavailableForLegalReasonsError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(451, ...args);
	}
}

export class InternalRequestError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(500, ...args);
	}
}

export class NotImplementedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(501, ...args);
	}
}

export class BadGatewayError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(502, ...args);
	}
}

export class ServiceUnavailableError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(503, ...args);
	}
}

export class GatewayTimeoutError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(504, ...args);
	}
}

export class HTTPVersionNotSupportedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(505, ...args);
	}
}

export class VariantAlsoNegotiatesError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(506, ...args);
	}
}

export class InsufficientStorageError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(507, ...args);
	}
}

export class LoopDetectedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(508, ...args);
	}
}

export class NotExtendedError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(510, ...args);
	}
}

export class NetworkAuthenticationRequiredError extends HttpError {
	constructor(...args: HttpErrorTailArgs) {
		super(511, ...args);
	}
}

export const statusCodeToError = {
	400: BadRequestError,
	401: UnauthorizedError,
	402: PaymentRequired,
	403: ForbiddenError,
	404: NotFoundError,
	405: MethodNotAllowedError,
	406: NotAcceptableError,
	407: ProxyAuthenticationRequiredError,
	408: RequestTimeoutError,
	409: ConflictError,
	410: GoneError,
	411: LengthRequiredError,
	412: PreconditionFailedError,
	413: PayloadTooLargeError,
	414: URITooLongError,
	415: UnsupportedMediaTypeError,
	416: RequestedRangeNotSatisfiableError,
	417: ExpectationFailedError,
	421: MisdirectedRequestError,
	422: UnprocessableEntityError,
	423: LockedError,
	424: FailedDependencyError,
	426: UpgradeRequiredError,
	428: PreconditionRequiredError,
	429: TooManyRequestsError,
	431: RequestHeaderFieldsTooLargeError,
	451: UnavailableForLegalReasonsError,
	500: InternalRequestError,
	501: NotImplementedError,
	502: BadGatewayError,
	503: ServiceUnavailableError,
	504: GatewayTimeoutError,
	505: HTTPVersionNotSupportedError,
	506: VariantAlsoNegotiatesError,
	507: InsufficientStorageError,
	508: LoopDetectedError,
	510: NotExtendedError,
	511: NetworkAuthenticationRequiredError,
};
