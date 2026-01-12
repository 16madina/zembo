import { useState, useCallback } from 'react';
import { isNative } from '@/lib/capacitor';

export interface Contact {
  contactId: string;
  displayName: string | null;
  phoneNumbers: { label?: string; number: string }[];
  emails: { label?: string; address: string }[];
  photoThumbnail?: string;
  organizationName?: string;
}

interface UseContactsReturn {
  contacts: Contact[];
  isLoading: boolean;
  hasPermission: boolean | null;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  fetchContacts: () => Promise<Contact[]>;
  pickContact: () => Promise<Contact | null>;
}

export const useContacts = (): UseContactsReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setError('Contacts not available on web');
      return false;
    }

    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      
      const result = await Contacts.requestPermissions();
      const granted = result.contacts === 'granted';
      
      setHasPermission(granted);
      setError(granted ? null : 'Permission denied');
      
      return granted;
    } catch (err) {
      console.error('Request contacts permission error:', err);
      setError('Failed to request permission');
      setHasPermission(false);
      return false;
    }
  }, []);

  const fetchContacts = useCallback(async (): Promise<Contact[]> => {
    if (!isNative) {
      setError('Contacts not available on web');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      
      // Check permission first
      const permResult = await Contacts.checkPermissions();
      
      if (permResult.contacts !== 'granted') {
        const requestResult = await Contacts.requestPermissions();
        if (requestResult.contacts !== 'granted') {
          setHasPermission(false);
          setError('Permission denied');
          setIsLoading(false);
          return [];
        }
      }
      
      setHasPermission(true);
      
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          image: true,
          organization: true,
        },
      });
      
      const mappedContacts: Contact[] = result.contacts.map(contact => ({
        contactId: contact.contactId,
        displayName: contact.name?.display || contact.name?.given || null,
        phoneNumbers: (contact.phones || []).map(p => ({
          label: p.label,
          number: p.number || '',
        })).filter(p => p.number),
        emails: (contact.emails || []).map(e => ({
          label: e.label,
          address: e.address || '',
        })).filter(e => e.address),
        photoThumbnail: contact.image?.base64String,
        organizationName: (contact.organization as any)?.name || (contact.organization as any)?.company,
      })).filter(c => c.displayName && (c.phoneNumbers.length > 0 || c.emails.length > 0));
      
      // Sort by display name
      mappedContacts.sort((a, b) => 
        (a.displayName || '').localeCompare(b.displayName || '')
      );
      
      setContacts(mappedContacts);
      return mappedContacts;
    } catch (err) {
      console.error('Fetch contacts error:', err);
      setError('Failed to fetch contacts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickContact = useCallback(async (): Promise<Contact | null> => {
    if (!isNative) {
      setError('Contacts not available on web');
      return null;
    }

    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      
      const result = await Contacts.pickContact({
        projection: {
          name: true,
          phones: true,
          emails: true,
          image: true,
          organization: true,
        },
      });
      
      if (!result.contact) {
        return null;
      }
      
      const contact = result.contact;
      
      return {
        contactId: contact.contactId,
        displayName: contact.name?.display || contact.name?.given || null,
        phoneNumbers: (contact.phones || []).map(p => ({
          label: p.label,
          number: p.number || '',
        })).filter(p => p.number),
        emails: (contact.emails || []).map(e => ({
          label: e.label,
          address: e.address || '',
        })).filter(e => e.address),
        photoThumbnail: contact.image?.base64String,
        organizationName: (contact.organization as any)?.name || (contact.organization as any)?.company,
      };
    } catch (err) {
      console.error('Pick contact error:', err);
      return null;
    }
  }, []);

  return {
    contacts,
    isLoading,
    hasPermission,
    error,
    requestPermission,
    fetchContacts,
    pickContact,
  };
};
