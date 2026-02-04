import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, RefreshCw, User, Stethoscope, Settings, Check, X, Menu, Download } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import jsPDF from 'jspdf';

export default function ChatInterface({ conversation, onConversationUpdate, setIsMobileOpen }) {
  const [messages, setMessages] = useState([]);
  const [currentRole, setCurrentRole] = useState('doctor');
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingLanguages, setEditingLanguages] = useState(false);
  const [tempLangs, setTempLangs] = useState({
    doctorLang: '',
    patientLang: ''
  });
  const scrollRef = useRef(null);

  const languages = [
    'English', 'Spanish', 'French', 'Hindi', 'Mandarin',
    'Arabic', 'Portuguese', 'Bengali', 'Russian', 'Japanese',
    'German', 'Korean', 'Italian', 'Turkish', 'Vietnamese'
  ];

  useEffect(() => {
    if (conversation?.id) {
      loadMessages();
      setSummary('');
      setTempLangs({
        doctorLang: conversation.doctor_lang,
        patientLang: conversation.patient_lang
      });
    } else {
      setMessages([]);
    }
  }, [conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/conversations/${conversation.id}/messages`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const updateLanguages = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('doctor_lang', tempLangs.doctorLang);
      formData.append('patient_lang', tempLangs.patientLang);

      const response = await fetch(`${apiUrl}/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update languages');

      const updatedConv = await response.json();
      
      if (onConversationUpdate) {
        onConversationUpdate(updatedConv);
      }
      
      setEditingLanguages(false);
      alert('Languages updated successfully!');
    } catch (error) {
      console.error('Failed to update languages:', error);
      alert('Failed to update languages');
    }
  };

  const cancelEdit = () => {
    setTempLangs({
      doctorLang: conversation.doctor_lang,
      patientLang: conversation.patient_lang
    });
    setEditingLanguages(false);
  };

  const handleMessageSent = (newMessage) => {
    setMessages([...messages, newMessage]);
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/conversations/${conversation.id}/summary`, {
        method: 'POST'
      });
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const exportSummaryAsPDF = () => {
    if (!summary) {
      alert('Generate a summary first!');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Medical Summary', margin, margin);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient: ${conversation.patient_name}`, margin, margin + 10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, margin + 15);
    doc.text(`Languages: ${conversation.doctor_lang} ↔ ${conversation.patient_lang}`, margin, margin + 20);

    doc.line(margin, margin + 25, pageWidth - margin, margin + 25);

    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(summary, maxWidth);
    doc.text(splitText, margin, margin + 35);

    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('Generated by MediTranslate', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`${conversation.patient_name}_summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sourceLang = currentRole === 'doctor' ? conversation?.doctor_lang : conversation?.patient_lang;
  const targetLang = currentRole === 'doctor' ? conversation?.patient_lang : conversation?.doctor_lang;

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <Button
          className="lg:hidden mb-4"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="w-4 h-4 mr-2" />
          Open Conversations
        </Button>
        <div className="text-center text-gray-500">
          <p className="text-lg">Select a conversation or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-[100dvh] lg:h-screen">
      {/* Header - Fixed height */}
      <div className="flex-none border-b bg-white">
        <div className="p-3 lg:p-4">
          <div className="flex items-start gap-2 mb-2">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Patient Name and Language Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg lg:text-xl truncate">{conversation.patient_name}</h2>
              
              {!editingLanguages ? (
                <div className="flex gap-2 mt-1 text-xs lg:text-sm text-gray-600 items-center flex-wrap">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 lg:w-4 lg:h-4" />
                    Doctor: {conversation.doctor_lang}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 lg:w-4 lg:h-4" />
                    Patient: {conversation.patient_lang}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingLanguages(true)}
                    className="h-5 px-1 lg:h-6 lg:px-2"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2 items-center">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <select
                      value={tempLangs.doctorLang}
                      onChange={(e) => setTempLangs({ ...tempLangs, doctorLang: e.target.value })}
                      className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <User className="w-4 h-4 text-green-600" />
                    <select
                      value={tempLangs.patientLang}
                      onChange={(e) => setTempLangs({ ...tempLangs, patientLang: e.target.value })}
                      className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={updateLanguages} size="sm" className="h-7">
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button onClick={cancelEdit} size="sm" variant="outline" className="h-7">
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Role Toggle Buttons */}
          <div className="flex gap-2 mb-2">
            <Button
              variant={currentRole === 'doctor' ? 'default' : 'outline'}
              onClick={() => setCurrentRole('doctor')}
              size="sm"
              className="flex-1 lg:flex-none text-xs h-8"
            >
              <Stethoscope className="w-3 h-3 mr-1" />
              Doctor
            </Button>
            <Button
              variant={currentRole === 'patient' ? 'default' : 'outline'}
              onClick={() => setCurrentRole('patient')}
              size="sm"
              className="flex-1 lg:flex-none text-xs h-8"
            >
              <User className="w-3 h-3 mr-1" />
              Patient
            </Button>
          </div>

          {/* Current Role Indicator */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-blue-50 px-2 lg:px-3 py-1.5 rounded-lg gap-1">
            <div className="flex items-center gap-2">
              {currentRole === 'doctor' ? (
                <>
                  <Stethoscope className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
                  <span className="text-xs lg:text-sm font-medium text-blue-900">
                    Viewing as: Doctor
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                  <span className="text-xs lg:text-sm font-medium text-green-900">
                    Viewing as: Patient
                  </span>
                </>
              )}
            </div>
            <Badge variant="outline" className="text-xs w-fit">
              {sourceLang} → {targetLang}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs - Flex container */}
      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-2 lg:mx-4 mt-2 shrink-0">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
          <ScrollArea className="flex-1 p-2 lg:p-4" ref={scrollRef}>
            {loadingMessages ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentRole={currentRole}
                />
              ))
            )}
          </ScrollArea>

          <div className="flex-none">
            <ChatInput
              conversationId={conversation.id}
              role={currentRole}
              sourceLang={sourceLang}
              targetLang={targetLang}
              onMessageSent={handleMessageSent}
            />
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="flex-1 p-2 lg:p-4 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-2 mb-4">
              <Button
                onClick={generateSummary}
                disabled={loadingSummary || messages.length === 0}
                className="flex-1"
              >
                {loadingSummary ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
              
              {summary && (
                <Button
                  onClick={exportSummaryAsPDF}
                  variant="outline"
                  className="flex-1 lg:flex-none"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
            </div>

            {summary && (
              <Card className="p-4 lg:p-6">
                <h3 className="font-bold text-base lg:text-lg mb-4">Medical Summary</h3>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                  {summary}
                </div>
              </Card>
            )}

            {!summary && !loadingSummary && (
              <div className="text-center text-gray-500 mt-8 text-sm">
                Click "Generate Summary" to create an AI-powered medical summary.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
