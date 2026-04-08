import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { 
  CheckCircle, 
  BookOpen, 
  Wallet, 
  TrendingUp, 
  Clock, 
  DollarSign,
  ArrowRight,
  Plus,
  Files,
  StickyNote,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [habitCount, setHabitCount] = useState(0);
  const [studyHours, setStudyHours] = useState(0);
  const [balance, setBalance] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch Habit stats
    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      setHabitCount(snapshot.size);
      updateChart(snapshot.docs, 'habits');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'habits');
    });

    // Fetch Study stats
    const studyQuery = query(collection(db, 'study'), where('userId', '==', user.uid));
    const unsubscribeStudy = onSnapshot(studyQuery, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().hours || 0), 0);
      setStudyHours(total);
      updateChart(snapshot.docs, 'study');
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'study');
    });

    // Fetch Finance stats
    const financeQuery = query(collection(db, 'finance'), where('userId', '==', user.uid));
    const unsubscribeFinance = onSnapshot(financeQuery, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        return data.type === 'income' ? acc + data.amount : acc - data.amount;
      }, 0);
      setBalance(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'finance');
    });

    // Fetch Files count
    const filesQuery = query(collection(db, 'users', user.uid, 'files'));
    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
      setFileCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/files`);
    });

    // Fetch Notes count
    const notesQuery = query(collection(db, 'users', user.uid, 'notes'));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      setNoteCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`);
    });

    // Fetch Team Members count
    const membersQuery = query(collection(db, 'users', user.uid, 'teamMembers'));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      setMemberCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/teamMembers`);
    });

    const updateChart = (docs: any[], type: 'habits' | 'study') => {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      setChartData(prev => {
        const newData = [...prev];
        last7Days.forEach(date => {
          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          let existing = newData.find(d => d.date === date);
          if (!existing) {
            existing = { name: dayName, date, habits: 0, study: 0 };
            newData.push(existing);
          }
          
          if (type === 'habits') {
            existing.habits = docs.filter(doc => doc.data().date === date).length;
          } else {
            existing.study = docs.filter(doc => doc.data().date === date).reduce((acc, doc) => acc + (doc.data().hours || 0), 0);
          }
        });
        return newData.sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
      });
    };

    return () => {
      unsubscribeHabits();
      unsubscribeStudy();
      unsubscribeFinance();
      unsubscribeFiles();
      unsubscribeNotes();
      unsubscribeMembers();
    };
  }, [user]);

  const stats = [
    { 
      name: 'Habits Active', 
      value: habitCount, 
      icon: CheckCircle, 
      color: 'bg-green-500', 
      path: '/habits',
      description: 'Daily consistency'
    },
    { 
      name: 'Study Hours', 
      value: `${studyHours}h`, 
      icon: BookOpen, 
      color: 'bg-blue-500', 
      path: '/study',
      description: 'Learning progress'
    },
    { 
      name: 'Net Balance', 
      value: `$${balance.toLocaleString()}`, 
      icon: Wallet, 
      color: 'bg-purple-500', 
      path: '/finance',
      description: 'Financial health'
    },
    { 
      name: 'Files Archived', 
      value: fileCount, 
      icon: Files, 
      color: 'bg-orange-500', 
      path: '/files',
      description: 'Data management'
    },
    { 
      name: 'Intelligence Briefs', 
      value: noteCount, 
      icon: StickyNote, 
      color: 'bg-yellow-500', 
      path: '/notes',
      description: 'Strategic thoughts'
    },
    { 
      name: 'Active Personnel', 
      value: memberCount, 
      icon: Users, 
      color: 'bg-indigo-500', 
      path: '/team',
      description: 'Team capacity'
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Operational Overview</h1>
        <p className="text-on-surface-variant mt-1">Welcome back, {user?.displayName || 'Commander'}. Here is your current status.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link 
            key={stat.name} 
            to={stat.path}
            className="group bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-outline opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">{stat.name}</h3>
            <p className="text-3xl font-black text-primary mt-1">{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-2">{stat.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-primary">Weekly Performance</h3>
            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1 text-green-500"><div className="w-2 h-2 bg-green-500 rounded-full" /> Habits</span>
              <span className="flex items-center gap-1 text-blue-500"><div className="w-2 h-2 bg-blue-500 rounded-full" /> Study</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#747781'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#747781'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f2f4f6' }}
                />
                <Bar dataKey="habits" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="study" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary p-6 rounded-2xl text-on-primary shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Quick Protocol</h3>
              <p className="text-sm text-on-primary/70 mb-6">Initialize a new tracking entry across any category.</p>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/habits" className="flex items-center justify-center gap-2 p-3 bg-on-primary/10 rounded-xl hover:bg-on-primary/20 transition-all text-sm font-bold">
                  <Plus className="w-4 h-4" /> Habit
                </Link>
                <Link to="/study" className="flex items-center justify-center gap-2 p-3 bg-on-primary/10 rounded-xl hover:bg-on-primary/20 transition-all text-sm font-bold">
                  <Plus className="w-4 h-4" /> Study
                </Link>
                <Link to="/files" className="flex items-center justify-center gap-2 p-3 bg-on-primary/10 rounded-xl hover:bg-on-primary/20 transition-all text-sm font-bold">
                  <Plus className="w-4 h-4" /> File
                </Link>
                <Link to="/notes" className="flex items-center justify-center gap-2 p-3 bg-on-primary/10 rounded-xl hover:bg-on-primary/20 transition-all text-sm font-bold">
                  <Plus className="w-4 h-4" /> Note
                </Link>
              </div>
            </div>
            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-on-primary/5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
