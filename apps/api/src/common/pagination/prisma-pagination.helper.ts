import { PaginatedResult } from "./pagination.dto";

export interface PaginateOptions<WhereInput, OrderByInput, SelectInput, IncludeInput> {
  where?: WhereInput;
  orderBy?: OrderByInput | OrderByInput[];
  select?: SelectInput;
  include?: IncludeInput;
  page?: number;
  pageSize?: number;
  tiebreakerField?: string;
}

/**
 * Execute paginated Prisma queries with a guaranteed unique tiebreaker.
 * Prevents missing or repeating records across consecutive pages.
 */
export async function paginatePrisma<T, Where = any, OrderBy = any, Select = any, Include = any>(
  modelDelegate: {
    findMany: (args: any) => Promise<T[]>;
    count: (args: any) => Promise<number>;
  },
  options: PaginateOptions<Where, OrderBy, Select, Include> = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 10));
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  const tiebreaker = options.tiebreakerField || "id";

  // Build tiebreaker order
  let finalOrderBy: any[];
  if (!options.orderBy) {
    finalOrderBy = [{ [tiebreaker]: "asc" }];
  } else if (Array.isArray(options.orderBy)) {
    const hasTiebreaker = options.orderBy.some(
      (orderObj: any) => typeof orderObj === "object" && tiebreaker in orderObj,
    );
    finalOrderBy = hasTiebreaker
      ? options.orderBy
      : [...options.orderBy, { [tiebreaker]: "asc" }];
  } else {
    const hasTiebreaker =
      typeof options.orderBy === "object" && tiebreaker in (options.orderBy as any);
    finalOrderBy = hasTiebreaker
      ? [options.orderBy]
      : [options.orderBy, { [tiebreaker]: "asc" }];
  }

  const queryArgs: any = {
    skip,
    take,
    where: options.where,
    orderBy: finalOrderBy,
  };

  if (options.select) {
    queryArgs.select = options.select;
  } else if (options.include) {
    queryArgs.include = options.include;
  }

  const [items, total] = await Promise.all([
    modelDelegate.findMany(queryArgs),
    modelDelegate.count({ where: options.where }),
  ]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    pageCount: totalPages,
  };
}
