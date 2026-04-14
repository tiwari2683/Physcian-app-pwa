import React from 'react';

interface AutoBulletTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeText: (text: string) => void;
}

export const AutoBulletTextArea: React.FC<AutoBulletTextAreaProps> = ({ value, onChangeText, className, onFocus, ...props }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const cursorPosition = target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
    const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);

    if (e.key === 'Enter') {
      // Check if the current line starts with a bullet marker
      const bulletMatch = currentLine.match(/^(\s*)([-•*]\s?)/);
      
      if (bulletMatch) {
        // Smart Exit: If the line ONLY contains a bullet (and maybe whitespace), 
        // pressing Enter should remove the bullet and end the list.
        if (currentLine.trim() === bulletMatch[2].trim()) {
          e.preventDefault();
          const newText = value.substring(0, lastNewlineIndex + 1) + value.substring(cursorPosition);
          onChangeText(newText);
          return;
        }

        e.preventDefault(); // Prevent default Enter behavior
        // Ensure there is a space after the bullet in the new line
        const bulletChar = bulletMatch[2].trim() || '-';
        const space = bulletMatch[2].endsWith(' ') ? '' : ' ';
        const bulletToInsert = `\n${bulletMatch[1]}${bulletChar}${space}`;
        
        const newText = value.substring(0, cursorPosition) + bulletToInsert + value.substring(target.selectionEnd);
        onChangeText(newText);
        
        // Set cursor position after React re-renders
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = cursorPosition + bulletToInsert.length;
        }, 0);
      }
    } else if (e.key === 'Backspace') {
        // If we are right after a bullet "- ", and we backspace, maybe remove the whole bullet
        if (currentLine.match(/^([-•*]\s)$/) && cursorPosition === lastNewlineIndex + 3) {
            // Optional: Handle specialized backspace if needed
        }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Proactive Bulleting: If empty and focused, start with a bullet
    if (!value || value.trim() === '') {
      onChangeText('- ');
    }
    if (onFocus) onFocus(e);
  };

  return (
    <textarea
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y ${className || ''}`}
      {...props}
    />
  );
};
