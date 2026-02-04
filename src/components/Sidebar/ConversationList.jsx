import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Trash2, Search, X, Menu } from 'lucide-react';

export default function ConversationList({ onSelectConversation, selectedId, isMobileOpen, setIsMobileOpen }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newConvData, setNewConvData] = useState({
    patientName: '',
    doctorLang: 'English',
    patientLang: 'Spanish'
  });

  const languages = [
    'English', 'Spanish', 'French', 'Hindi', 'Mandarin',
    'Arabic', 'Portuguese', 'Bengali', 'Russian', 'Japanese',
    'German', 'Korean', 'Italian', 'Turkish', 'Vietnamese'
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const debounce = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadConversations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/conversations`);
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    
    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/conversations/${convId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      setConversations(conversations.filter(c => c.id !== convId));
      
      if (selectedId === convId) {
        onSelectConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const createNewConversation = async () => {
    if (!newConvData.patientName.trim()) {
      alert('Please enter patient name');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('patient_name', newConvData.patientName);
      formData.append('doctor_lang', newConvData.doctorLang);
      formData.append('patient_lang', newConvData.patientLang);

      const response = await fetch(`${apiUrl}/api/conversations`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const newConv = await response.json();
      
      setConversations([newConv, ...conversations]);
      onSelectConversation(newConv);
      
      setNewConvData({
        patientName: '',
        doctorLang: 'English',
        patientLang: 'Spanish'
      });
      setShowNewDialog(false);
      setIsMobileOpen(false); // Close sidebar on mobile after creating
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert(`Failed to create conversation: ${error.message}`);
    }
  };

  const selectConversationFromSearch = (result) => {
    const conv = conversations.find(c => c.id === result.conversation_id);
    if (conv) {
      onSelectConversation(conv);
      setSearchQuery('');
      setSearchResults([]);
      setIsMobileOpen(false); // Close on mobile
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200">{part}</mark>
        : part
    );
  };

  return (
    <div className={`w-80 border-r bg-gray-50 flex flex-col h-screen ${
      isMobileOpen ? 'fixed inset-0 z-50 lg:relative' : 'hidden lg:flex'
    }`}>
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Conversations</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          )}
        </div>

        <Button onClick={() => setShowNewDialog(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* New Conversation Dialog */}
      {showNewDialog && (
        <div className="p-4 bg-white border-b">
          <h3 className="font-semibold mb-3">New Conversation</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Patient Name
              </label>
              <input
                type="text"
                value={newConvData.patientName}
                onChange={(e) => setNewConvData({ ...newConvData, patientName: e.target.value })}
                placeholder="Enter patient name"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Doctor's Language
              </label>
              <select
                value={newConvData.doctorLang}
                onChange={(e) => setNewConvData({ ...newConvData, doctorLang: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Patient's Language
              </label>
              <select
                value={newConvData.patientLang}
                onChange={(e) => setNewConvData({ ...newConvData, patientLang: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={createNewConversation} className="flex-1">
                Create
              </Button>
              <Button 
                onClick={() => {
                  setShowNewDialog(false);
                  setNewConvData({
                    patientName: '',
                    doctorLang: 'English',
                    patientLang: 'Spanish'
                  });
                }} 
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 px-2 mb-2">
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((result) => (
              <Card
                key={result.message_id}
                onClick={() => selectConversationFromSearch(result)}
                className="p-3 mb-2 cursor-pointer hover:bg-blue-50 transition"
              >
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 mt-1 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{result.patient_name}</div>
                    <Badge variant="outline" className="text-xs mb-1">
                      {result.role}
                    </Badge>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {highlightText(result.context, searchQuery)}
                    </p>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(result.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Conversation List */}
        {searchResults.length === 0 && (
          <>
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm">Loading...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet.<br/>Click "New Conversation" to start.
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv);
                      setIsMobileOpen(false);
                    }}
                    className={`p-3 cursor-pointer hover:bg-blue-50 transition relative group ${
                      selectedId === conv.id ? 'bg-blue-100 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{conv.patient_name}</div>
                        <div className="text-xs text-gray-500">
                          {conv.doctor_lang} ↔ {conv.patient_lang}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={(e) => deleteConversation(conv.id, e)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
