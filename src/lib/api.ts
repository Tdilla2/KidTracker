// AWS API Gateway client for KidTrackerApp
const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api';

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (data: any | any[]) => QueryBuilder;
  update: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  single: () => QueryBuilder;
  then: (resolve: (result: any) => void, reject?: (error: any) => void) => Promise<any>;
}

class ApiClient {
  private table: string = '';
  private method: string = 'GET';
  private body: any = null;
  private filters: Record<string, any> = {};
  private orderBy: string = '';
  private orderAsc: boolean = true;
  private limitCount: number = 0;
  private isSingle: boolean = false;

  from(table: string): QueryBuilder {
    const client = new ApiClient();
    client.table = table;
    return client as unknown as QueryBuilder;
  }

  select(_columns?: string): QueryBuilder {
    // Only set to GET if not already doing an insert/update/delete
    // This allows chaining .select() after .insert() to return the inserted row
    if (!this.body) {
      this.method = 'GET';
    }
    return this as unknown as QueryBuilder;
  }

  insert(data: any | any[]): QueryBuilder {
    this.method = 'POST';
    this.body = Array.isArray(data) ? data[0] : data;
    return this as unknown as QueryBuilder;
  }

  update(data: any): QueryBuilder {
    this.method = 'PUT';
    this.body = data;
    return this as unknown as QueryBuilder;
  }

  delete(): QueryBuilder {
    this.method = 'DELETE';
    return this as unknown as QueryBuilder;
  }

  eq(column: string, value: any): QueryBuilder {
    this.filters[column] = value;
    return this as unknown as QueryBuilder;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder {
    this.orderBy = column;
    this.orderAsc = options?.ascending !== false;
    return this as unknown as QueryBuilder;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this as unknown as QueryBuilder;
  }

  single(): QueryBuilder {
    this.isSingle = true;
    return this as unknown as QueryBuilder;
  }

  async then(resolve: (result: any) => void, reject?: (error: any) => void): Promise<any> {
    try {
      let url = `${API_BASE}/${this.table}`;

      // If filtering by id, append to URL
      if (this.filters.id) {
        url += `/${this.filters.id}`;
      }

      const options: RequestInit = {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.body && (this.method === 'POST' || this.method === 'PUT')) {
        options.body = JSON.stringify(this.body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error ${response.status}`);
      }

      let data = null;
      if (response.status !== 204) {
        data = await response.json();
      }

      // Handle array vs single item
      if (this.isSingle && Array.isArray(data)) {
        data = data[0] || null;
      }

      resolve({ data, error: null });
      return { data, error: null };
    } catch (error: any) {
      const result = { data: null, error };
      if (reject) {
        reject(result);
      }
      resolve(result);
      return result;
    }
  }
}

// Export a singleton instance
export const api = new ApiClient();

// Also export a supabase-compatible interface
export const supabase = {
  from: (table: string) => new ApiClient().from(table)
};
