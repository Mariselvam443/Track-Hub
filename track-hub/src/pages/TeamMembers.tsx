import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { Plus, Users, Shield, MoreVertical, Mail, ExternalLink, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

interface MemberData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: any;
}

const TeamMembers: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const membersRef = collection(db, 'users', user.uid, 'teamMembers');
    const q = query(membersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberData)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/teamMembers`);
    });

    return unsubscribe;
  }, [user]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !user) return;

    setIsSaving(true);
    try {
      // Use email as doc ID for easy lookup in security rules
      const memberId = email.toLowerCase().trim();
      await setDoc(doc(db, 'users', user.uid, 'teamMembers', memberId), {
        name,
        email: memberId,
        role: role || 'Member',
        createdAt: serverTimestamp()
      });
      setName('');
      setEmail('');
      setRole('');
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/teamMembers`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!user || !window.confirm('Are you sure you want to remove this team member? They will lose access to your shared data.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'teamMembers', memberId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/teamMembers/${memberId}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Personnel Roster</h1>
          <p className="text-on-surface-variant mt-1">Manage your team and operational collaborators.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Member
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant font-medium">Loading roster...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
          <div className="p-6 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Active Personnel</h3>
            </div>
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
              {members.length} Total
            </span>
          </div>

          <div className="divide-y divide-outline-variant/10">
            {members.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4 text-outline">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-primary">No team members added</h3>
                <p className="text-on-surface-variant mt-2 max-w-xs mx-auto">Expand your operational capacity by adding your first team member.</p>
              </div>
            ) : (
              members.map(member => (
                <div key={member.id} className="p-6 flex items-center justify-between group hover:bg-surface-container-low transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container font-black text-lg">
                      {member.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary">{member.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-on-surface-variant" />
                          <span className="text-xs text-on-surface-variant">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-on-surface-variant" />
                          <span className="text-xs text-on-surface-variant font-medium">{member.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 text-outline hover:text-error transition-all opacity-0 group-hover:opacity-100"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Deploy New Personnel"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Anderson"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., john@example.com"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Role / Designation</label>
            <input 
              type="text" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Senior Analyst"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
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
              {isSaving ? 'Deploying...' : 'Add to Roster'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamMembers;
