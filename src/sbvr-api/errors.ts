import TypedError = require('typed-error');

export class PayloadError extends TypedError {
	constructor(
		name: string,
		public payload: { [k: string]: any } | undefined
	) {
		super(name)
	}
}

export class PermissionError extends TypedError {}
export class PermissionParsingError extends TypedError {}

export class UnsupportedMethodError extends TypedError {}
export class SqlCompilationError extends TypedError {}
export class SbvrValidationError extends TypedError {}
export class InternalRequestError extends TypedError {}

export class TranslationError extends TypedError {}
export class ParsingError extends TypedError {}
export class BadRequestError extends PayloadError {}
export class ForbiddenError extends TypedError {}
