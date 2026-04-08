import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, collectionGroup, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { Plus, FolderPlus, FileText, Folder, MoreVertical, Search, HardDrive, Share2, User, Trash2, Info } from 'lucide-react';
import Modal from '../components/Modal';

interface FolderData {
  id: string;
  name: string;
  createdAt: any;
}

interface FileData {
  id: string;
  name: string;
  folderId?: string;
  size: string;
  createdAt: any;
  ownerId?: string;
  ownerName?: string;
}

const MyFiles: React.FC = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [sharedFolders, setSharedFolders] = useState<FolderData[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileData[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [loading, setLoading] = useState(true);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileSize, setNewFileSize] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const foldersRef = collection(db, 'users', user.uid, 'folders');
    const filesRef = collection(db, 'users', user.uid, 'files');

    const unsubscribeFolders = onSnapshot(query(foldersRef, orderBy('createdAt', 'desc')), (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderData)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/folders`);
    });

    const unsubscribeFiles = onSnapshot(query(filesRef, orderBy('createdAt', 'desc')), (snapshot) => {
      setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileData)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/files`);
    });

    // Fetch Shared Content
    const sharedQuery = query(collectionGroup(db, 'teamMembers'), where('email', '==', user.email?.toLowerCase().trim()));
    const unsubscribeShared = onSnapshot(sharedQuery, (snapshot) => {
      const ownerIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
      
      if (ownerIds.length === 0) {
        setSharedFolders([]);
        setSharedFiles([]);
        return;
      }

      // For each owner, fetch their files and folders
      ownerIds.forEach(ownerId => {
        const oFoldersRef = collection(db, 'users', ownerId, 'folders');
        const oFilesRef = collection(db, 'users', ownerId, 'files');

        onSnapshot(oFoldersRef, (s) => {
          setSharedFolders(prev => {
            const others = prev.filter(f => !s.docs.map(d => d.id).includes(f.id));
            const newFolders = s.docs.map(d => ({ id: d.id, ...d.data(), ownerId } as any as FolderData));
            return [...others, ...newFolders];
          });
        });

        onSnapshot(oFilesRef, (s) => {
          setSharedFiles(prev => {
            const others = prev.filter(f => !s.docs.map(d => d.id).includes(f.id));
            const newFiles = s.docs.map(d => ({ id: d.id, ...d.data(), ownerId } as any as FileData));
            return [...others, ...newFiles];
          });
        });
      });
    });

    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
      unsubscribeShared();
    };
  }, [user]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'folders'), {
        name: newFolderName,
        createdAt: serverTimestamp()
      });
      setNewFolderName('');
      setIsFolderModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/folders`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileSize.trim() || !user) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'files'), {
        name: newFileName,
        size: newFileSize,
        folderId: selectedFolderId || null,
        createdAt: serverTimestamp()
      });
      setNewFileName('');
      setNewFileSize('');
      setSelectedFolderId('');
      setIsFileModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/files`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this folder? Files inside will remain in the root directory.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'folders', folderId));
      // Optionally update files that were in this folder to have no folderId
      const filesInFolder = files.filter(f => f.folderId === folderId);
      for (const file of filesInFolder) {
        // We could update them here, but for simplicity we'll just let them be "orphaned" in the UI (Root)
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/folders/${folderId}`);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'files', fileId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/files/${fileId}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Digital Archives</h1>
          <p className="text-on-surface-variant mt-1">Manage and organize your mission-critical data.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsFolderModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-primary font-bold rounded-xl hover:bg-surface-container-highest transition-all border border-outline-variant/20"
          >
            <FolderPlus className="w-5 h-5" />
            New Folder
          </button>
          <button 
            onClick={() => setIsFileModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add File
          </button>
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="p-2.5 bg-surface-container-high text-primary rounded-xl hover:bg-surface-container-highest transition-all border border-outline-variant/20"
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
          My Archives
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
          <p className="text-on-surface-variant font-medium">Synchronizing archives...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Folders Grid */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Folder className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                {activeTab === 'my' ? 'Folders' : 'Shared Folders'}
              </h3>
            </div>
            {(activeTab === 'my' ? folders : sharedFolders).length === 0 ? (
              <div className="p-8 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/50 text-center">
                <p className="text-on-surface-variant italic">No folders found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(activeTab === 'my' ? folders : sharedFolders).map(folder => (
                  <div key={folder.id} className="group bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Folder className="w-6 h-6 fill-current" />
                      </div>
                      {activeTab === 'my' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="p-1 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-primary truncate">{folder.name}</h4>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      {(activeTab === 'my' ? files : sharedFiles).filter(f => f.folderId === folder.id).length} items
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Files List */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                {activeTab === 'my' ? 'Recent Files' : 'Shared Files'}
              </h3>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/20">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-primary">Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-primary">Folder</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-primary">Size</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-primary">Date Added</th>
                      {activeTab === 'shared' && <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-primary">Owner</th>}
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {(activeTab === 'my' ? files : sharedFiles).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic">
                          No files found.
                        </td>
                      </tr>
                    ) : (
                      (activeTab === 'my' ? files : sharedFiles).map(file => (
                        <tr key={file.id} className="group hover:bg-surface-container-low transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-surface-container-high rounded-lg text-on-surface-variant">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold text-primary">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-on-surface-variant">
                              {(activeTab === 'my' ? folders : sharedFolders).find(f => f.id === file.folderId)?.name || 'Root'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono text-on-surface-variant">{file.size}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-on-surface-variant">
                              {file.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                            </span>
                          </td>
                          {activeTab === 'shared' && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-primary" />
                                <span className="text-xs font-bold text-primary truncate max-w-[100px]">{file.ownerId}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            {activeTab === 'my' && (
                              <button 
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      <Modal 
        isOpen={isFolderModalOpen} 
        onClose={() => setIsFolderModalOpen(false)} 
        title="New Folder Protocol"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Folder Name</label>
            <input 
              type="text" 
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g., Financial Reports"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsFolderModalOpen(false)}
              className="flex-1 px-4 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Initializing...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isFileModalOpen} 
        onClose={() => setIsFileModalOpen(false)} 
        title="Archive New Entry"
      >
        <form onSubmit={handleAddFile} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">File Name</label>
            <input 
              type="text" 
              required
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g., project_blueprint.pdf"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Size</label>
            <input 
              type="text" 
              required
              value={newFileSize}
              onChange={(e) => setNewFileSize(e.target.value)}
              placeholder="e.g., 2.4 MB"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Folder (Optional)</label>
            <select 
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            >
              <option value="">Root Directory</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsFileModalOpen(false)}
              className="flex-1 px-4 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Archiving...' : 'Add File'}
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

export default MyFiles;
