import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { Plus, Trash2, Check, Flame, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Habit {
  id: string;
  habitName: string;
  date: string;
  status: boolean;
  userId: string;
}

const HabitTracker: React.FC = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid), where('date', '==', today));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const habitList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      setHabits(habitList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'habits');
    });

    return unsubscribe;
  }, [user]);

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim() || !user) return;

    try {
      await addDoc(collection(db, 'habits'), {
        userId: user.uid,
        habitName: newHabitName,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: false,
        createdAt: serverTimestamp()
      });
      setNewHabitName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'habits');
    }
  };

  const toggleHabit = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'habits', id), {
        status: !currentStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `habits/${id}`);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'habits', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `habits/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Habit Ledger</h1>
          <p className="text-on-surface-variant mt-1">Consistency is the foundation of excellence.</p>
        </div>
      </header>

      {/* Add Habit Form */}
      <form onSubmit={addHabit} className="flex gap-3">
        <input 
          type="text" 
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          placeholder="Enter a new habit protocol..."
          className="flex-1 px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
        />
        <button 
          type="submit"
          className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </form>

      {/* Habit List */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Daily Checklist</h3>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Calendar className="w-4 h-4" />
            {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </div>
        
        <div className="divide-y divide-outline-variant/10">
          {habits.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-on-surface-variant italic">No habits initialized for today.</p>
            </div>
          ) : (
            habits.map((habit) => (
              <div key={habit.id} className="p-4 flex items-center justify-between group hover:bg-surface-container-low transition-all">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleHabit(habit.id, habit.status)}
                    className={`
                      w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all
                      ${habit.status 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-outline-variant/50 hover:border-primary'}
                    `}
                  >
                    {habit.status && <Check className="w-5 h-5" />}
                  </button>
                  <div>
                    <p className={`text-sm font-bold ${habit.status ? 'text-on-surface-variant line-through' : 'text-primary'}`}>
                      {habit.habitName}
                    </p>
                    <p className="text-[10px] text-outline uppercase tracking-tighter">Daily Routine</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteHabit(habit.id)}
                  className="p-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Insights */}
      {habits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Completion Rate</h4>
            <p className="text-2xl font-black text-primary">
              {Math.round((habits.filter(h => h.status).length / habits.length) * 100)}%
            </p>
            <div className="w-full h-1.5 bg-outline-variant/20 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${(habits.filter(h => h.status).length / habits.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitTracker;
