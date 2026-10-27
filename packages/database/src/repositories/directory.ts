// Stubs only (task step 15). Method names from the directory command
// catalogue (03-routes-and-contracts.md §4, module `directory`, T-201/T-204).
import { NotImplemented } from './not-implemented';

export class PgDirectoryRepository {
  getDoctor(publicId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { publicId });
  }

  listDoctors(filters: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-201', { filters });
  }

  getFacility(publicId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { publicId });
  }

  listFacilities(filters: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-201', { filters });
  }

  doctorsAtBranch(branchId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { branchId });
  }

  facilitiesForDoctor(doctorId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { doctorId });
  }

  submitProfile(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-204', { input });
  }

  listSubmissions(query: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-407', { query });
  }

  listClaims(query: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-407', { query });
  }

  listFieldChanges(query: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-407', { query });
  }

  decideSubmission(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-204', { input });
  }

  claimProfile(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-204', { input });
  }

  decideClaim(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-204', { input });
  }

  proposeFieldChange(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-204', { input });
  }

  decideFieldChange(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-204', { input });
  }
}
