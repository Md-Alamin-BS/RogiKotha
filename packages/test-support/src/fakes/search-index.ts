// `SearchIndex` port fake (03-routes-and-contracts.md §3:
// `upsert(doc)`, `remove(kind, refId)`, `search(query, filters, page)`, `suggest(q)`).
// Task step 5: "NaiveSearchIndex (substring match)".
export interface SearchDoc {
  kind: string;
  refId: string;
  publicId: string;
  titleEn?: string;
  titleBn?: string;
  bodyEn?: string;
  bodyBn?: string;
  published: boolean;
}

export class NaiveSearchIndex {
  private readonly docs = new Map<string, SearchDoc>();

  private key(kind: string, refId: string): string {
    return `${kind}:${refId}`;
  }

  upsert(doc: SearchDoc): Promise<void> {
    this.docs.set(this.key(doc.kind, doc.refId), doc);
    return Promise.resolve();
  }

  remove(kind: string, refId: string): Promise<void> {
    this.docs.delete(this.key(kind, refId));
    return Promise.resolve();
  }

  search(
    query: string,
    filters?: { kind?: string },
    page?: { page?: number; pageSize?: number },
  ): Promise<{ results: SearchDoc[]; total: number }> {
    const q = query.trim().toLowerCase();
    const all = [...this.docs.values()].filter((d) => {
      if (!d.published) return false;
      if (filters?.kind && d.kind !== filters.kind) return false;
      if (!q) return true;
      const haystack = [d.titleEn, d.titleBn, d.bodyEn, d.bodyBn]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    const pageSize = page?.pageSize ?? 20;
    const start = ((page?.page ?? 1) - 1) * pageSize;
    return Promise.resolve({ results: all.slice(start, start + pageSize), total: all.length });
  }

  suggest(q: string): Promise<{ kind: string; publicId: string; title: string }[]> {
    const query = q.trim().toLowerCase();
    return Promise.resolve(
      [...this.docs.values()]
        .filter(
          (d) =>
            d.published && (d.titleEn?.toLowerCase().includes(query) || d.titleBn?.includes(query)),
        )
        .slice(0, 8)
        .map((d) => ({ kind: d.kind, publicId: d.publicId, title: d.titleEn ?? d.titleBn ?? '' })),
    );
  }
}
