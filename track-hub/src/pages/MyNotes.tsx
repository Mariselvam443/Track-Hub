import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, collectionGroup, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { Plus, StickyNote, Clock, MoreVertical, Search, Share2, User, Trash2, Info } from 'lucide-react';
import Modal from '../components/Modal';

interface NoteData {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  ownerId?: string;
}

const MyNotes: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [sharedNotes, setSharedNotes] = useState<NoteData[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const notesRef = collection(db, 'users', user.uid, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NoteData)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`);
    });

    // Fetch Shared Notes
    const sharedQuery = query(collectionGroup(db, 'teamMembers'), where('email', '==', user.email?.toLowerCase().trim()));
    const unsubscribeShared = onSnapshot(sharedQuery, (snapshot) => {
      const ownerIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
      
      if (ownerIds.length === 0) {
        setSharedNotes([]);
        return;
      }

      ownerIds.forEach(ownerId => {
        const oNotesRef = collection(db, 'users', ownerId, 'notes');
        onSnapshot(oNotesRef, (s) => {
          setSharedNotes(prev => {
            const others = prev.filter(n => !s.docs.map(d => d.id).includes(n.id));
            const newNotes = s.docs.map(d => ({ id: d.id, ...d.data(), ownerId } as any as NoteData));
            return [...others, ...newNotes];
          });
        });
      });
    });

    return () => {
      unsubscribe();
      unsubscribeShared();
    };
  }, [user]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        title,
        content,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setContent('');
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/notes`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this intelligence brief?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/notes/${noteId}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Intelligence Briefs</h1>
          <p className="text-on-surface-variant mt-1">Capture and organize your strategic thoughts.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Note
          </button>
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="p-3 bg-surface-container-high text-primary rounded-xl hover:bg-surface-container-highest transition-all border border-outline-variant/20"
            title="Sharing Settings"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex border-b border-outline-variant/20">
        <button 
          onClick={() => setActiveTab('my')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'my' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
        >
          My Briefs
        </button>
        <button 
          onClick={() => setActiveTab('shared')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'shared' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
        >
          <Share2 className="w-4 h-4" />
          Shared with Me
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant font-medium">Retrieving intel...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'my' ? notes : sharedNotes).length === 0 ? (
            <div className="col-span-full p-20 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/50">
              <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mx-auto mb-4 text-outline">
                <StickyNote className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-primary">No notes found</h3>
              <p className="text-on-surface-variant mt-2 max-w-xs mx-auto">
                {activeTab === 'my' ? 'Initialize your first intelligence brief to start tracking your thoughts.' : 'No intelligence briefs have been shared with you yet.'}
              </p>
            </div>
          ) : (
            (activeTab === 'my' ? notes : sharedNotes).map(note => (
              <div key={note.id} className="group bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  {activeTab === 'my' && (
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-2 text-outline hover:text-error transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2 line-clamp-1">{note.title}</h3>
                <p className="text-sm text-on-surface-variant line-clamp-4 flex-1 mb-6 leading-relaxed">
                  {note.content || <span className="italic opacity-50">No additional content provided.</span>}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-outline">
                    <Clock className="w-3 h-3" />
                    {note.createdAt?.toDate().toLocaleDateString() || 'Just now'}
                  </div>
                  {activeTab === 'shared' && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">{note.ownerId}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Initialize New Brief"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Strategic Objectives Q3"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Content</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detailed intelligence data..."
              rows={5}
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Processing...' : 'Create Brief'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        title="Sharing Protocols"
      >
        <div className="space-y-6">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4">
            <Info className="w-6 h-6 text-primary shrink-0" />
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Sharing in Track Hub is managed via your <span className="font-bold text-primary">Personnel Roster</span>. 
              Any member added to your team gains <span className="font-bold text-primary">view-only access</span> to your archives and briefs.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Current Access</h4>
            <p className="text-xs text-on-surface-variant">
              To manage who can see your data, visit the Team Members section.
            </p>
            <button 
              onClick={() => window.location.href = '/team'}
              className="w-full px-4 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Manage Team Members
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyNotes;
