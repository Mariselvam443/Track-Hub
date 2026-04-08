import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface FinanceEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  userId: string;
}

const FinanceTracker: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(true);

  const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Salary', 'Investment', 'Other'];

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'finance'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceEntry));
      setEntries(entryList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'finance');
    });

    return unsubscribe;
  }, [user]);

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !user) return;

    try {
      await addDoc(collection(db, 'finance'), {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        category,
        date: format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      });
      setAmount('');
      setCategory('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finance');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'finance', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `finance/${id}`);
    }
  };

  const totalIncome = entries.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const pieData = entries.filter(e => e.type === 'expense').reduce((acc: any[], e) => {
    const existing = acc.find(item => item.name === e.category);
    if (existing) {
      existing.value += e.amount;
    } else {
      acc.push({ name: e.category, value: e.amount });
    }
    return acc;
  }, []);

  const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Finance Ledger</h1>
          <p className="text-on-surface-variant mt-1">Hard-edged fiscal oversight.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-lowest px-4 py-2 rounded-xl border border-outline-variant/20 shadow-sm">
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Net Balance</p>
            <p className={`text-xl font-black tabular-nums ${balance >= 0 ? 'text-green-500' : 'text-error'}`}>
              ${balance.toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form & List */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={addEntry} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm space-y-4">
            <div className="flex gap-2 mb-4">
              <button 
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'expense' ? 'bg-error text-on-error' : 'bg-surface-container-low text-on-surface-variant'}`}
              >
                Expense
              </button>
              <button 
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'income' ? 'bg-green-500 text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}
              >
                Income
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button 
              type="submit"
              className={`w-full py-3 text-on-primary font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-error shadow-error/20' : 'bg-green-500 shadow-green-500/20'}`}
            >
              <Plus className="w-5 h-5" />
              Log Transaction
            </button>
          </form>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Transaction Ledger</h3>
              <Wallet className="w-4 h-4 text-outline" />
            </div>
            <div className="divide-y divide-outline-variant/10">
              {entries.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-on-surface-variant italic">No transactions recorded yet.</p>
                </div>
              ) : (
                entries.slice().reverse().map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between group hover:bg-surface-container-low transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-error/10 text-error'}`}>
                        {entry.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{entry.category}</p>
                        <p className="text-[10px] text-outline uppercase tracking-tighter">
                          {format(new Date(entry.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-black tabular-nums ${entry.type === 'income' ? 'text-green-500' : 'text-error'}`}>
                        {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                      </span>
                      <button 
                        onClick={() => deleteEntry(entry.id)}
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
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Expense Breakdown</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Total Income</p>
              <p className="text-xl font-black text-green-600 tabular-nums">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-error/10 p-4 rounded-2xl border border-error/20">
              <p className="text-[10px] font-bold text-error uppercase tracking-widest">Total Expense</p>
              <p className="text-xl font-black text-error tabular-nums">${totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceTracker;
