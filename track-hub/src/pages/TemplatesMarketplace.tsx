import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { 
  Search, 
  Download, 
  Upload,
  FileJson,
  User as UserIcon,
  X,
  FileUp,
  Plus,
  Trash2,
  Wand2,
  Code
} from 'lucide-react';
import { format } from 'date-fns';

interface Template {
  id: string;
  templateName: string;
  category: 'Habit' | 'Study' | 'Finance';
  createdBy: string;
  creatorName: string;
  jsonData: string;
  createdAt: any;
}

const TemplatesMarketplace: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Habit' | 'Study' | 'Finance'>('Habit');
  const [json, setJson] = useState('');
  const [isBuilderMode, setIsBuilderMode] = useState(true);
  const [builderItems, setBuilderItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'templates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
      setTemplates(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'templates');
    });
    return unsubscribe;
  }, [user]);

  // Sync builder items to JSON
  useEffect(() => {
    if (isBuilderMode) {
      setJson(JSON.stringify({ items: builderItems }, null, 2));
    }
  }, [builderItems, isBuilderMode]);

  const addBuilderItem = () => {
    if (newItem.trim()) {
      setBuilderItems([...builderItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeBuilderItem = (index: number) => {
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Validate JSON
        JSON.parse(content);
        setJson(content);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !json) return;

    try {
      await addDoc(collection(db, 'templates'), {
        templateName: name,
        category,
        jsonData: json,
        createdBy: user.uid,
        creatorName: user.displayName || 'Anonymous',
        createdAt: new Date().toISOString()
      });
      setIsUploadModalOpen(false);
      setName('');
      setJson('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'templates');
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.templateName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Template Hub</h1>
          <p className="text-on-surface-variant mt-1">Browse and share technical blueprints for tracking.</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary text-sm font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Upload className="w-5 h-5" />
          Share Template
        </button>
      </header>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blueprints..."
            className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Habit', 'Study', 'Finance'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryFilter === cat ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="group bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden hover:shadow-xl transition-all flex flex-col">
            <div className="aspect-video bg-surface-container-low flex items-center justify-center relative overflow-hidden">
              <FileJson className="w-12 h-12 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-3 right-3 bg-primary-container/20 text-primary px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                {template.category}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-primary mb-2 truncate">{template.templateName}</h3>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
                <UserIcon className="w-4 h-4" />
                <span>{template.creatorName}</span>
              </div>
              <div className="mt-auto pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-outline uppercase">
                  {template.createdAt ? format(new Date(template.createdAt), 'MMM d, yyyy') : 'Recently'}
                </span>
                <button className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                  <Download className="w-4 h-4" />
                  Use Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-primary text-on-primary flex justify-between items-center">
              <h3 className="text-xl font-bold">New Ledger Template</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">Template Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Quarterly Fiscal Audit"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="Habit">Habit</option>
                  <option value="Study">Study</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsBuilderMode(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${isBuilderMode ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                >
                  <Wand2 className="w-4 h-4" />
                  Builder Mode
                </button>
                <button
                  type="button"
                  onClick={() => setIsBuilderMode(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${!isBuilderMode ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                >
                  <Code className="w-4 h-4" />
                  Manual JSON
                </button>
              </div>

              {isBuilderMode ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline">Items to Track</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBuilderItem())}
                      className="flex-1 px-4 py-2 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                      placeholder={`Add a ${category.toLowerCase()}...`}
                    />
                    <button 
                      type="button"
                      onClick={addBuilderItem}
                      className="p-2 bg-primary text-on-primary rounded-xl"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {builderItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group">
                        <span className="text-sm">{item}</span>
                        <button 
                          type="button"
                          onClick={() => removeBuilderItem(index)}
                          className="text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {builderItems.length === 0 && (
                      <p className="text-center text-xs text-on-surface-variant py-4 italic">No items added yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline">JSON Data</label>
                  <div className="flex flex-col gap-2">
                    <textarea 
                      value={json}
                      onChange={(e) => setJson(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary outline-none h-32 font-mono text-xs"
                      placeholder='{ "tasks": [...] }'
                      required
                    />
                    <label className="flex items-center justify-center gap-2 py-2 bg-surface-container-high text-on-surface-variant rounded-lg cursor-pointer hover:bg-surface-container-highest transition-all text-sm font-bold">
                      <FileUp className="w-4 h-4" />
                      Upload JSON File
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:brightness-110 transition-all"
              >
                Initialize Upload
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesMarketplace;
