/** One page of a list paginated in the database. */
export interface Page<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}
