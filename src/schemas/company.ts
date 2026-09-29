import { z } from 'zod';
import { PAGINATION_DEFAULT_TAKE, PAGINATION_MAX_TAKE } from '../constants.js';
import { CompanyFindManyZodSchema } from '../generated/zod/schemas/findManyCompany.schema.js';
import { CompanyCreateInputObjectZodSchema } from '../generated/zod/schemas/objects/CompanyCreateInput.schema.js';
import { CompanyWhereInputObjectZodSchema } from '../generated/zod/schemas/objects/CompanyWhereInput.schema.js';
import { CompanyModelSchema } from '../generated/zod/schemas/variants/pure/Company.pure.js';

export const companyBodySchema = CompanyCreateInputObjectZodSchema.omit({
	id: true,
	user: true,
	postings: true,
}).extend({
	name: z.string().min(1).meta({ example: 'Acme Corp' }),
	city: z.string().optional().default('').meta({ example: 'Madrid' }),
	country: z.string().optional().default('').meta({ example: 'ES' }),
});

const scopedGetCompaniesWhereSchema = CompanyWhereInputObjectZodSchema.omit({
	userId: true,
});

export const getCompanyOptionsSchema = CompanyFindManyZodSchema.pick({
	orderBy: true,
	take: true,
	skip: true,
}).extend({
	where: scopedGetCompaniesWhereSchema.optional(),
	take: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION_MAX_TAKE)
		.default(PAGINATION_DEFAULT_TAKE)
		.meta({ example: 50 }),
	skip: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
});

export const getCompanyParamsSchema = z.object({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
});

export const companyResponseSchema = CompanyModelSchema.pick({
	id: true,
	name: true,
	city: true,
	country: true,
}).extend({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
	name: z.string().meta({ example: 'Acme Corp' }),
	city: z.string().meta({ example: 'Madrid' }),
	country: z.string().meta({ example: 'ES' }),
});

export type CreateCompanyInput = z.infer<typeof companyBodySchema>;
export type GetCompanyParams = z.infer<typeof getCompanyParamsSchema>;
export type GetCompaniesOptions = z.infer<typeof getCompanyOptionsSchema>;
