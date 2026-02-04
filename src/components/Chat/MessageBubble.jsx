import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, User } from 'lucide-react';

export default function MessageBubble({ message, currentRole }) {
  const isDoctor = message.role === 'doctor';
  const showOriginal = message.role === currentRole;

  return (
    <div className={`flex ${isDoctor ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] lg:max-w-[70%] ${isDoctor ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Sender Label */}
        <div className={`flex items-center gap-1 px-2 ${isDoctor ? 'flex-row-reverse' : 'flex-row'}`}>
          {isDoctor ? (
            <>
              <Stethoscope className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Doctor</span>
            </>
          ) : (
            <>
              <User className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-700">Patient</span>
            </>
          )}
        </div>

        {/* Message Card */}
        <Card className={`p-3 ${
          isDoctor 
            ? 'bg-blue-500 text-white' 
            : 'bg-green-100 text-gray-900 border-green-300'
        }`}>
          <div className="space-y-2">
            {/* Main text */}
            <div className="text-sm font-medium break-words">
              {showOriginal ? message.original_text : message.translated_text}
            </div>

            {/* Translation */}
            <div className={`text-xs border-t pt-2 break-words ${
              isDoctor 
                ? 'text-blue-100 border-blue-400' 
                : 'text-gray-600 border-green-300'
            }`}>
              {showOriginal ? message.translated_text : message.original_text}
            </div>

            {/* Audio player */}
            {message.audio_url && (
              <div className={`pt-2 border-t ${
                isDoctor ? 'border-blue-400' : 'border-green-300'
              }`}>
                <audio controls src={message.audio_url} className="w-full h-8" />
              </div>
            )}

            {/* Timestamp */}
            <div className={`text-xs ${
              isDoctor ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
