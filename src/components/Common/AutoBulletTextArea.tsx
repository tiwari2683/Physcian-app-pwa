import React from 'react';

interface AutoBulletTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeText: (text: string) => void;
}

export const AutoBulletTextArea: React.FC<AutoBulletTextAreaProps> = ({ value, onChangeText, className, ...props }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLTextAreaElement;
      const cursorPosition = target.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      
      // Find the start of the current line
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);
      
      // Check if the current line starts with a bullet marker
      const bulletMatch = currentLine.match(/^(\s*)([-•*]\s)/);
      
      if (bulletMatch) {
        e.preventDefault(); // Prevent default Enter behavior
        const bulletToInsert = `\n${bulletMatch[1]}${bulletMatch[2]}`;
        
        const newText = value.substring(0, cursorPosition) + bulletToInsert + value.substring(target.selectionEnd);
        onChangeText(newText);
        
        // Set cursor position after React re-renders
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = cursorPosition + bulletToInsert.length;
        }, 0);
      }
    }
  };

  return (
    <textarea
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      onKeyDown={handleKeyDown}
      className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y ${className || ''}`}
      {...props}
    />
  );
};
