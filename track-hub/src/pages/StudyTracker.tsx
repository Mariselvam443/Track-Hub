import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { Plus, Trash2, BookOpen, Clock, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface StudySession {
  id: string;
  subject: string;
  hours: number;
  date: string;
  userId: string;
}

const StudyTracker: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'study'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySession));
      setSessions(sessionList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'study');
    });

    return unsubscribe;
  }, [user]);

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !hours || !user) return;

    try {
      await addDoc(collection(db, 'study'), {
        userId: user.uid,
        subject: subject,
        hours: parseFloat(hours),
        date: format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      });
      setSubject('');
      setHours('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'study');
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'study', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `study/${id}`);
    }
  };

  const totalHours = sessions.reduce((acc, s) => acc + s.hours, 0);
  
  const chartData = sessions.reduce((acc: any[], s) => {
    const existing = acc.find(item => item.name === s.subject);
    if (existing) {
      existing.hours += s.hours;
    } else {
      acc.push({ name: s.subject, hours: s.hours });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Study Terminal</h1>
          <p className="text-on-surface-variant mt-1">Knowledge is the ultimate asset.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
          <Clock className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-bold text-primary">{totalHours} Total Hours</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form & List */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={addSession} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-2">New Session Log</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Quantum Physics"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Hours</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="2.5"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Log Session
            </button>
          </form>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Recent Activity</h3>
              <BarChart2 className="w-4 h-4 text-outline" />
            </div>
            <div className="divide-y divide-outline-variant/10">
              {sessions.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-on-surface-variant italic">No study sessions recorded yet.</p>
                </div>
              ) : (
                sessions.slice().reverse().map((session) => (
                  <div key={session.id} className="p-4 flex items-center justify-between group hover:bg-surface-container-low transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{session.subject}</p>
                        <p className="text-[10px] text-outline uppercase tracking-tighter">
                          {format(new Date(session.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-primary tabular-nums">{session.hours}h</span>
                      <button 
                        onClick={() => deleteSession(session.id)}
                        className="p-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Subject Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0e3e5" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#747781'}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#747781'}} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyTracker;
