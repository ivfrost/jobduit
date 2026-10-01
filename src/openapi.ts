import * as z from 'zod';
import { createDocument } from 'zod-openapi';
import {
	ApiKeyCreateSchema,
	ApiKeyRevokeSchema,
	apiKeyCreateResponseSchema,
	apiKeyResponseSchema,
} from './schemas/apiKey.js';
import { loginSchema, publicUserSchema } from './schemas/auth.js';
import {
	companyBodySchema,
	companyResponseSchema,
	getCompanyOptionsSchema,
	getCompanyParamsSchema,
} from './schemas/company.js';
import { paginationResponseSchema } from './schemas/pagination.js';
import {
	createPostingSchema,
	getPostingParamsSchema,
	postingDetailResponseSchema,
	postingResponseSchema,
	updatePostingSchema,
} from './schemas/postings.js';

// Named, reusable schemas
const errorSchema = z.object({ error: z.string() }).meta({ id: 'Error' });
const userSchema = publicUserSchema.meta({ id: 'User' });
const companySchema = companyResponseSchema.meta({ id: 'Company' });
const postingSchema = postingResponseSchema;
const postingDetailSchema = postingDetailResponseSchema;
const apiKeySchema = apiKeyResponseSchema.meta({ id: 'ApiKey' });
const healthSchema = z.object({ ok: z.literal(true) }).meta({ id: 'Health' });

const paginationQuerySchema = z
	.object({
		take: getCompanyOptionsSchema.shape.take,
		skip: getCompanyOptionsSchema.shape.skip,
	})
	.meta({ id: 'PaginationQuery' });

const paginated = <T extends z.ZodType>(schema: T) =>
	z.object({ data: z.array(schema), pagination: paginationResponseSchema });

const json = (schema: z.ZodType) => ({
	'application/json': { schema },
});

const response = (description: string, schema?: z.ZodType) => ({
	description,
	...(schema ? { content: json(schema) } : {}),
});

type SecurityRequirement = Record<string, string[]>;

const anyAuth: SecurityRequirement[] = [{ bearerAuth: [] }];

const SESSION_ONLY_NOTE =
	'Requires a session cookie. Not available via API key.';

export const openApiDocument = createDocument(
	{
		openapi: '3.1.0',
		info: {
			title: 'Jobduit API',
			version: '1.0.0',
			description: `OpenAPI spec for Jobduit - the smart job application tracker. Manage job postings, companies, and API keys.

**Authentication.** Protected endpoints accept an API key sent as \`Authorization: Bearer jd_live_…\`. Issue one via \`POST /api/keys\`.

Session-only endpoints (auth, key management) are not exposed here — they require the \`sid\` cookie set by \`POST /api/auth/login\` and are intended for the web UI, not the extension.`,
		},
		servers: [{ url: '/' }],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'API key',
					description:
						'API key issued via POST /api/keys. Send as `Authorization: Bearer jd_live_…`.',
				},
			},
		},
		paths: {
			'/health': {
				get: {
					tags: ['System'],
					responses: {
						'200': response('The service is healthy.', healthSchema),
					},
				},
			},
			'/api/auth/login': {
				post: {
					tags: ['Authentication'],
					description: SESSION_ONLY_NOTE,
					requestBody: { required: true, content: json(loginSchema) },
					responses: {
						'200': response('Authenticated user.', userSchema),
						'400': response('Invalid input.', errorSchema),
						'401': response('Invalid credentials.', errorSchema),
					},
				},
			},
			'/api/auth/logout': {
				post: {
					tags: ['Authentication'],
					description: SESSION_ONLY_NOTE,
					responses: {
						'204': response('Session ended.'),
						'401': response('Not authenticated.', errorSchema),
					},
				},
			},
			'/api/auth/me': {
				get: {
					tags: ['Authentication'],
					description: SESSION_ONLY_NOTE,
					responses: {
						'200': response('Current authenticated user.', userSchema),
						'401': response('Not authenticated.', errorSchema),
					},
				},
			},
			'/api/companies': {
				get: {
					tags: ['Companies'],
					security: anyAuth,
					requestParams: { query: paginationQuerySchema },
					responses: {
						'200': response('Companies.', paginated(companySchema)),
						'401': response('Unauthorized.', errorSchema),
					},
				},
				post: {
					tags: ['Companies'],
					security: anyAuth,
					requestBody: { required: true, content: json(companyBodySchema) },
					responses: {
						'200': response('Existing company.', companySchema),
						'201': response('Created company.', companySchema),
						'400': response('Invalid input.', errorSchema),
						'401': response('Unauthorized.', errorSchema),
					},
				},
			},
			'/api/companies/{id}': {
				get: {
					tags: ['Companies'],
					security: anyAuth,
					requestParams: { path: getCompanyParamsSchema },
					responses: {
						'200': response('Company.', companySchema),
						'404': response('Company not found.', errorSchema),
					},
				},
				put: {
					tags: ['Companies'],
					security: anyAuth,
					requestParams: { path: getCompanyParamsSchema },
					requestBody: { required: true, content: json(companyBodySchema) },
					responses: {
						'200': response('Updated company.', companySchema),
						'404': response('Company not found.', errorSchema),
					},
				},
				delete: {
					tags: ['Companies'],
					security: anyAuth,
					requestParams: { path: getCompanyParamsSchema },
					responses: {
						'204': response('Company deleted.'),
						'404': response('Company not found.', errorSchema),
					},
				},
			},
			'/api/postings': {
				get: {
					tags: ['Job postings'],
					security: anyAuth,
					requestParams: { query: paginationQuerySchema },
					responses: {
						'200': response('Job postings.', paginated(postingSchema)),
						'401': response('Unauthorized.', errorSchema),
					},
				},
				post: {
					tags: ['Job postings'],
					security: anyAuth,
					description:
						'Create a posting. The server computes the canonical URL, content hash, and source ID. ' +
						'Fields like `workMode`, `minYearsExperience`, and salary are extracted from `body` ' +
						'when not provided explicitly.',
					requestBody: { required: true, content: json(createPostingSchema) },
					responses: {
						'200': response('Existing posting updated.', postingSchema),
						'201': response('Created posting.', postingSchema),
						'400': response('Invalid input.', errorSchema),
						'401': response('Unauthorized.', errorSchema),
					},
				},
			},
			'/api/postings/{id}': {
				get: {
					tags: ['Job postings'],
					security: anyAuth,
					requestParams: { path: getPostingParamsSchema },
					responses: {
						'200': response('Job posting.', postingDetailSchema),
						'404': response('Posting not found.', errorSchema),
					},
				},
				put: {
					tags: ['Job postings'],
					security: anyAuth,
					description:
						'Update a posting. Extraction fields are re-derived from `body` when it changes.',
					requestParams: { path: getPostingParamsSchema },
					requestBody: { required: true, content: json(updatePostingSchema) },
					responses: {
						'200': response('Updated posting.', postingSchema),
						'404': response('Posting not found.', errorSchema),
					},
				},
				delete: {
					tags: ['Job postings'],
					security: anyAuth,
					requestParams: { path: getPostingParamsSchema },
					responses: {
						'204': response('Posting deleted.'),
						'404': response('Posting not found.', errorSchema),
					},
				},
			},
			'/api/keys': {
				get: {
					tags: ['API keys'],
					description: SESSION_ONLY_NOTE,
					responses: {
						'200': response('API keys.', z.array(apiKeySchema)),
						'401': response('Unauthorized.', errorSchema),
					},
				},
				post: {
					tags: ['API keys'],
					description: SESSION_ONLY_NOTE,
					requestBody: { required: true, content: json(ApiKeyCreateSchema) },
					responses: {
						'201': response(
							'Created API key. The raw key is only returned once.',
							apiKeyCreateResponseSchema,
						),
						'400': response('Invalid input.', errorSchema),
						'401': response('Unauthorized.', errorSchema),
					},
				},
			},
			'/api/keys/{id}': {
				delete: {
					tags: ['API keys'],
					description: SESSION_ONLY_NOTE,
					requestParams: { path: ApiKeyRevokeSchema },
					responses: {
						'204': response('API key revoked.'),
						'400': response('API key already revoked.', errorSchema),
						'401': response('Unauthorized.', errorSchema),
						'404': response('API key not found.', errorSchema),
					},
				},
			},
		},
	},
	{
		override: ({ jsonSchema }) => {
			if (jsonSchema.example !== undefined) return;
			if (jsonSchema.format === 'email') jsonSchema.example = 'user@jobdu.it';
			if (jsonSchema.format === 'uuid') {
				jsonSchema.example = '00000000-0000-0000-0000-000000000000';
			}
			if (jsonSchema.format === 'date-time') {
				jsonSchema.example = '2026-01-01T00:00:00.000Z';
			}
		},
	},
);
