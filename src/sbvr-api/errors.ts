import type { AnyObject } from './common-types';

import { TypedError } from 'typed-error';

export class PermissionError extends TypedError {}
export class PermissionParsingError extends TypedError {}

export class SqlCompilationError extends TypedError {}
export class SbvrValidationError extends TypedError {}

export class TranslationError extends TypedError {}
export class ParsingError extends TypedError {}
export { AnyObject };

export class HttpError extends TypedError {
	constructor(
		public status: number,
		error: string | Error = '',
		public body?: string | AnyObject,
	) {
		super(error);
	}

	public getResponseBody() {
		return this.body !== undefined ? this.body : this.message;
	}
}

export class BadRequestError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(400, error, body);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(401, error, body);
	}
}

export class PaymentRequired extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(402, error, body);
	}
}

export class ForbiddenError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(403, error, body);
	}
}

export class NotFoundError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(404, error, body);
	}
}

export class MethodNotAllowedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(405, error, body);
	}
}

export class NotAcceptableError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(406, error, body);
	}
}

export class ProxyAuthenticationRequiredError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(407, error, body);
	}
}

export class RequestTimeoutError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(408, error, body);
	}
}

export class ConflictError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(409, error, body);
	}
}

export class GoneError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(410, error, body);
	}
}

export class LengthRequiredError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(411, error, body);
	}
}

export class PreconditionFailedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(412, error, body);
	}
}

export class PayloadTooLargeError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(413, error, body);
	}
}

export class URITooLongError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(414, error, body);
	}
}

export class UnsupportedMediaTypeError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(415, error, body);
	}
}

export class RequestedRangeNotSatisfiableError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(416, error, body);
	}
}

export class ExpectationFailedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(417, error, body);
	}
}

export class MisdirectedRequestError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(421, error, body);
	}
}

export class UnprocessableEntityError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(422, error, body);
	}
}

export class LockedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(423, error, body);
	}
}

export class FailedDependencyError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(424, error, body);
	}
}

export class UpgradeRequiredError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(426, error, body);
	}
}

export class PreconditionRequiredError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(428, error, body);
	}
}

export class TooManyRequestsError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(429, error, body);
	}
}

export class RequestHeaderFieldsTooLargeError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(431, error, body);
	}
}

export class UnavailableForLegalReasonsError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(451, error, body);
	}
}

export class InternalRequestError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(500, error, body);
	}
}

export class NotImplementedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(501, error, body);
	}
}

export class BadGatewayError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(502, error, body);
	}
}

export class ServiceUnavailableError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(503, error, body);
	}
}

export class GatewayTimeoutError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(504, error, body);
	}
}

export class HTTPVersionNotSupportedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(505, error, body);
	}
}

export class VariantAlsoNegotiatesError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(506, error, body);
	}
}

export class InsufficientStorageError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(507, error, body);
	}
}

export class LoopDetectedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(508, error, body);
	}
}

export class NotExtendedError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(510, error, body);
	}
}

export class NetworkAuthenticationRequiredError extends HttpError {
	constructor(error?: string | Error, body?: string | AnyObject) {
		super(511, error, body);
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
