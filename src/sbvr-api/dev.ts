// These types were generated by @balena/abstract-sql-to-typescript v5.0.0

import type { Types } from '@balena/abstract-sql-to-typescript';

export interface Model {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Serial']['Read'];
		is_of__vocabulary: Types['Short Text']['Read'];
		model_type: Types['Short Text']['Read'];
		model_value: Types['JSON']['Read'];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Serial']['Write'];
		is_of__vocabulary: Types['Short Text']['Write'];
		model_type: Types['Short Text']['Write'];
		model_value: Types['JSON']['Write'];
	};
}

export default interface $Model {
	model: Model;
}
