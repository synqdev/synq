/**
 * @jest-environment node
 */

/**
 * Intake Form Upload Route Tests
 *
 * Tests for GET/POST/DELETE /api/admin/customers/[id]/intake
 */

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/storage/supabase-storage', () => ({
  uploadIntakeForm: jest.fn(),
  getSignedUrl: jest.fn(),
  deleteIntakeForm: jest.fn(),
}));

jest.mock('@/lib/services/medical-record.service', () => ({
  createMedicalRecord: jest.fn(),
  getMedicalRecordsWithSignedUrls: jest.fn(),
  deleteMedicalRecord: jest.fn(),
}));

jest.mock('@/lib/db/client', () => ({
  prisma: {
    medicalRecordItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { uploadIntakeForm } from '@/lib/storage/supabase-storage';
import {
  createMedicalRecord,
  getMedicalRecordsWithSignedUrls,
  deleteMedicalRecord,
} from '@/lib/services/medical-record.service';
import { prisma } from '@/lib/db/client';
import { GET, POST, DELETE } from '../../app/api/admin/customers/[id]/intake/route';

const makeParams = (id: string) => Promise.resolve({ id });

describe('Intake Form Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/customers/[id]/intake', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake');
      const res = await GET(req, { params: makeParams('cust-1') });

      expect(res.status).toBe(401);
    });

    it('returns records for customer', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      const mockRecords = [
        { id: 'rec-1', signedUrl: 'https://signed.url', enteredAt: '2024-01-01' },
      ];
      (getMedicalRecordsWithSignedUrls as jest.Mock).mockResolvedValueOnce(mockRecords);

      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake');
      const res = await GET(req, { params: makeParams('cust-1') });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.records).toEqual(mockRecords);
      expect(getMedicalRecordsWithSignedUrls).toHaveBeenCalledWith('cust-1');
    });
  });

  describe('POST /api/admin/customers/[id]/intake', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const formData = new FormData();
      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req, { params: makeParams('cust-1') });

      expect(res.status).toBe(401);
    });

    it('returns 400 when no file provided', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const formData = new FormData();
      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req, { params: makeParams('cust-1') });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('No file provided');
    });

    it('returns 400 for invalid file type', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req, { params: makeParams('cust-1') });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Invalid file type');
    });

    it('uploads file and creates record on valid request', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (prisma.medicalRecordItem.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'item-1',
        title: 'Intake Form',
        contentType: 'image',
      });
      (uploadIntakeForm as jest.Mock).mockResolvedValueOnce({ path: 'cust-1/123-test.pdf' });
      const mockRecord = { id: 'rec-1', imageUrl: 'cust-1/123-test.pdf' };
      (createMedicalRecord as jest.Mock).mockResolvedValueOnce(mockRecord);

      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req, { params: makeParams('cust-1') });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.record).toEqual(mockRecord);
      expect(uploadIntakeForm).toHaveBeenCalledWith('cust-1', expect.any(File));
      expect(createMedicalRecord).toHaveBeenCalledWith({
        customerId: 'cust-1',
        itemId: 'item-1',
        imageUrl: 'cust-1/123-test.pdf',
        enteredBy: 'admin',
      });
    });

    it('auto-creates intake item when none exists', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (prisma.medicalRecordItem.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.medicalRecordItem.create as jest.Mock).mockResolvedValueOnce({
        id: 'new-item',
        title: 'Intake Form',
        contentType: 'image',
      });
      (uploadIntakeForm as jest.Mock).mockResolvedValueOnce({ path: 'cust-1/file.jpg' });
      (createMedicalRecord as jest.Mock).mockResolvedValueOnce({ id: 'rec-1' });

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest('http://localhost/api/admin/customers/cust-1/intake', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req, { params: makeParams('cust-1') });

      expect(res.status).toBe(201);
      expect(prisma.medicalRecordItem.create).toHaveBeenCalled();
      expect(createMedicalRecord).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 'new-item' })
      );
    });
  });

  describe('DELETE /api/admin/customers/[id]/intake', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest(
        'http://localhost/api/admin/customers/cust-1/intake?recordId=rec-1',
        { method: 'DELETE' }
      );
      const res = await DELETE(req, { params: makeParams('cust-1') });

      expect(res.status).toBe(401);
    });

    it('returns 400 when recordId missing', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest(
        'http://localhost/api/admin/customers/cust-1/intake',
        { method: 'DELETE' }
      );
      const res = await DELETE(req, { params: makeParams('cust-1') });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('recordId is required');
    });

    it('deletes record successfully', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (deleteMedicalRecord as jest.Mock).mockResolvedValueOnce(undefined);

      const req = new NextRequest(
        'http://localhost/api/admin/customers/cust-1/intake?recordId=rec-1',
        { method: 'DELETE' }
      );
      const res = await DELETE(req, { params: makeParams('cust-1') });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(deleteMedicalRecord).toHaveBeenCalledWith('rec-1');
    });

    it('returns 500 when delete fails', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (deleteMedicalRecord as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const req = new NextRequest(
        'http://localhost/api/admin/customers/cust-1/intake?recordId=bad-id',
        { method: 'DELETE' }
      );
      const res = await DELETE(req, { params: makeParams('cust-1') });

      expect(res.status).toBe(500);
    });
  });
});
