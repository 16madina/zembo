import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Phone, Mail, X, Check, Share2, Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContacts, Contact } from '@/hooks/useContacts';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { isNative } from '@/lib/capacitor';

interface InviteFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteFriendsModal = ({ open, onOpenChange }: InviteFriendsModalProps) => {
  const { language } = useLanguage();
  const { contacts, isLoading, hasPermission, error, fetchContacts, requestPermission } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const t = {
    fr: {
      title: 'Inviter des amis',
      search: 'Rechercher un contact...',
      noContacts: 'Aucun contact trouvé',
      permissionNeeded: 'Autorisation requise',
      permissionDesc: 'Zembo a besoin d\'accéder à vos contacts pour inviter vos amis.',
      grantAccess: 'Autoriser l\'accès',
      selectAll: 'Tout sélectionner',
      deselectAll: 'Tout désélectionner',
      invite: 'Inviter',
      invited: 'Invité',
      sending: 'Envoi...',
      success: 'Invitations envoyées !',
      webShare: 'Partager le lien',
      webShareDesc: 'Partagez Zembo avec vos amis',
      copyLink: 'Copier le lien',
      linkCopied: 'Lien copié !',
    },
    en: {
      title: 'Invite Friends',
      search: 'Search contacts...',
      noContacts: 'No contacts found',
      permissionNeeded: 'Permission Required',
      permissionDesc: 'Zembo needs access to your contacts to invite friends.',
      grantAccess: 'Grant Access',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      invite: 'Invite',
      invited: 'Invited',
      sending: 'Sending...',
      success: 'Invitations sent!',
      webShare: 'Share Link',
      webShareDesc: 'Share Zembo with your friends',
      copyLink: 'Copy Link',
      linkCopied: 'Link copied!',
    },
  };

  const texts = t[language];

  useEffect(() => {
    if (open && isNative && hasPermission === null) {
      requestPermission();
    }
  }, [open, hasPermission, requestPermission]);

  useEffect(() => {
    if (open && hasPermission === true && contacts.length === 0) {
      fetchContacts();
    }
  }, [open, hasPermission, contacts.length, fetchContacts]);

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.displayName?.toLowerCase().includes(query) ||
      contact.phoneNumbers.some(p => p.number.includes(query)) ||
      contact.emails.some(e => e.address.toLowerCase().includes(query))
    );
  });

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.contactId)));
    }
  };

  const handleInvite = async () => {
    if (selectedContacts.size === 0) return;

    setIsSending(true);
    
    // Simulate sending invitations
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(texts.success);
    setSelectedContacts(new Set());
    setIsSending(false);
    onOpenChange(false);
  };

  const handleWebShare = async () => {
    const shareData = {
      title: 'Zembo',
      text: texts.webShareDesc,
      url: 'https://zembo.app',
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText('https://zembo.app');
      toast.success(texts.linkCopied);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Web version - show share button
  if (!isNative) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {texts.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Share2 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              {texts.webShareDesc}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleWebShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                {texts.webShare}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText('https://zembo.app');
                  toast.success(texts.linkCopied);
                }}
              >
                {texts.copyLink}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {texts.title}
          </DialogTitle>
        </DialogHeader>

        {hasPermission === false && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-semibold">{texts.permissionNeeded}</h3>
            <p className="text-center text-muted-foreground text-sm">
              {texts.permissionDesc}
            </p>
            <Button onClick={requestPermission} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {texts.grantAccess}
            </Button>
          </div>
        )}

        {hasPermission === true && (
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={texts.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select All Button */}
            {filteredContacts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="self-end text-xs"
              >
                {selectedContacts.size === filteredContacts.length 
                  ? texts.deselectAll 
                  : texts.selectAll}
              </Button>
            )}

            {/* Contacts List */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {texts.noContacts}
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence>
                    {filteredContacts.map((contact, index) => (
                      <motion.div
                        key={contact.contactId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => toggleContact(contact.contactId)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          selectedContacts.has(contact.contactId)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Avatar className="w-10 h-10">
                          {contact.photoThumbnail && (
                            <AvatarImage 
                              src={`data:image/jpeg;base64,${contact.photoThumbnail}`} 
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(contact.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {contact.displayName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {contact.phoneNumbers[0] && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.phoneNumbers[0].number}
                              </span>
                            )}
                            {contact.emails[0] && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.emails[0].address}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedContacts.has(contact.contactId)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}>
                          {selectedContacts.has(contact.contactId) && (
                            <Check className="w-4 h-4 text-primary-foreground" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* Invite Button */}
            {selectedContacts.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button 
                  onClick={handleInvite} 
                  className="w-full gap-2"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {texts.sending}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {texts.invite} ({selectedContacts.size})
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
