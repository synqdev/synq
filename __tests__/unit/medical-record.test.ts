/**
 * Medical Record Service Unit Tests
 */

jest.mock('@/lib/db/client', () => ({
  prisma: {
    medicalRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/storage/supabase-storage', () => ({
  getSignedUrl: jest.fn(),
  deleteIntakeForm: jest.fn(),
}));

import { prisma } from '@/lib/db/client';
import { getSignedUrl, deleteIntakeForm } from '@/lib/storage/supabase-storage';
import {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordsWithSignedUrls,
  deleteMedicalRecord,
} from '@/lib/services/medical-record.service';

describe('Medical Record Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMedicalRecord', () => {
    it('creates a record with correct args', async () => {
      const mockRecord = {
        id: 'rec-1',
        customerId: 'cust-1',
        itemId: 'item-1',
        imageUrl: 'cust-1/123-file.pdf',
        enteredBy: 'admin',
        item: { id: 'item-1', title: 'Intake Form', contentType: 'image' },
      };
      (prisma.medicalRecord.create as jest.Mock).mockResolvedValueOnce(mockRecord);

      const result = await createMedicalRecord({
        customerId: 'cust-1',
        itemId: 'item-1',
        imageUrl: 'cust-1/123-file.pdf',
        enteredBy: 'admin',
      });

      expect(prisma.medicalRecord.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          itemId: 'item-1',
          content: undefined,
          imageUrl: 'cust-1/123-file.pdf',
          enteredBy: 'admin',
        },
        include: { item: true },
      });
      expect(result).toEqual(mockRecord);
    });

    it('throws when neither content nor imageUrl is provided', async () => {
      await expect(
        createMedicalRecord({
          customerId: 'cust-1',
          itemId: 'item-1',
          enteredBy: 'admin',
        })
      ).rejects.toThrow('At least one of content or imageUrl must be provided');

      expect(prisma.medicalRecord.create).not.toHaveBeenCalled();
    });

    it('creates a record with text content', async () => {
      (prisma.medicalRecord.create as jest.Mock).mockResolvedValueOnce({ id: 'rec-2' });

      await createMedicalRecord({
        customerId: 'cust-1',
        itemId: 'item-2',
        content: 'Patient notes',
        enteredBy: 'admin',
      });

      expect(prisma.medicalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Patient notes',
            imageUrl: undefined,
          }),
        })
      );
    });
  });

  describe('getMedicalRecords', () => {
    it('queries by customerId ordered by enteredAt desc', async () => {
      (prisma.medicalRecord.findMany as jest.Mock).mockResolvedValueOnce([]);

      await getMedicalRecords('cust-1');

      expect(prisma.medicalRecord.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        orderBy: { enteredAt: 'desc' },
        include: {
          item: {
            select: { id: true, title: true, contentType: true },
          },
        },
      });
    });
  });

  describe('getMedicalRecordsWithSignedUrls', () => {
    it('generates signed URLs for records with imageUrl', async () => {
      const records = [
        {
          id: 'rec-1',
          customerId: 'cust-1',
          content: null,
          imageUrl: 'cust-1/file.pdf',
          enteredBy: 'admin',
          enteredAt: new Date('2024-06-01'),
          item: { id: 'item-1', title: 'Intake', contentType: 'image' },
        },
        {
          id: 'rec-2',
          customerId: 'cust-1',
          content: 'Text notes',
          imageUrl: null,
          enteredBy: 'admin',
          enteredAt: new Date('2024-06-02'),
          item: { id: 'item-2', title: 'Notes', contentType: 'text' },
        },
      ];
      (prisma.medicalRecord.findMany as jest.Mock).mockResolvedValueOnce(records);
      (getSignedUrl as jest.Mock).mockResolvedValueOnce('https://signed.url/file.pdf');

      const result = await getMedicalRecordsWithSignedUrls('cust-1');

      expect(getSignedUrl).toHaveBeenCalledTimes(1);
      expect(getSignedUrl).toHaveBeenCalledWith('cust-1/file.pdf');
      expect(result[0].signedUrl).toBe('https://signed.url/file.pdf');
      expect(result[1].signedUrl).toBeNull();
    });

    it('handles signed URL errors gracefully', async () => {
      const records = [
        {
          id: 'rec-1',
          customerId: 'cust-1',
          content: null,
          imageUrl: 'cust-1/file.pdf',
          enteredBy: 'admin',
          enteredAt: new Date('2024-06-01'),
          item: { id: 'item-1', title: 'Intake', contentType: 'image' },
        },
      ];
      (prisma.medicalRecord.findMany as jest.Mock).mockResolvedValueOnce(records);
      (getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await getMedicalRecordsWithSignedUrls('cust-1');

      expect(result[0].signedUrl).toBeNull();
    });
  });

  describe('deleteMedicalRecord', () => {
    it('deletes record and storage file when imageUrl exists', async () => {
      (prisma.medicalRecord.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rec-1',
        imageUrl: 'cust-1/file.pdf',
      });
      (deleteIntakeForm as jest.Mock).mockResolvedValueOnce(undefined);
      (prisma.medicalRecord.delete as jest.Mock).mockResolvedValueOnce({});

      await deleteMedicalRecord('rec-1');

      expect(deleteIntakeForm).toHaveBeenCalledWith('cust-1/file.pdf');
      expect(prisma.medicalRecord.delete).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
      });
    });

    it('deletes record without storage call when no imageUrl', async () => {
      (prisma.medicalRecord.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rec-2',
        imageUrl: null,
      });
      (prisma.medicalRecord.delete as jest.Mock).mockResolvedValueOnce({});

      await deleteMedicalRecord('rec-2');

      expect(deleteIntakeForm).not.toHaveBeenCalled();
      expect(prisma.medicalRecord.delete).toHaveBeenCalledWith({
        where: { id: 'rec-2' },
      });
    });

    it('throws when record not found', async () => {
      (prisma.medicalRecord.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(deleteMedicalRecord('nonexistent')).rejects.toThrow('Record not found');
    });
  });
});
