'use client';

import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';

/**
 * Editor WYSIWYG mínimo: negrito, itálico, listas e parágrafos — o
 * suficiente para uma descrição de evento. Guarda e devolve HTML.
 */
export function EditorDeTexto({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Sobre o que é o evento…' }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-evento min-h-32 px-3 py-2 text-sm outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-40 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg-muted',
          className,
        )}
      >
        Carregando editor…
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-line bg-bg', className)}>
      <div className="flex items-center gap-1 border-b border-line p-1.5">
        <BotaoDeFormatacao
          ativo={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          rotulo="Negrito"
        >
          <BoldIcon className="size-3.5" aria-hidden="true" />
        </BotaoDeFormatacao>
        <BotaoDeFormatacao
          ativo={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          rotulo="Itálico"
        >
          <ItalicIcon className="size-3.5" aria-hidden="true" />
        </BotaoDeFormatacao>
        <BotaoDeFormatacao
          ativo={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          rotulo="Lista"
        >
          <ListIcon className="size-3.5" aria-hidden="true" />
        </BotaoDeFormatacao>
        <BotaoDeFormatacao
          ativo={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          rotulo="Lista numerada"
        >
          <ListOrderedIcon className="size-3.5" aria-hidden="true" />
        </BotaoDeFormatacao>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function BotaoDeFormatacao({
  ativo,
  onClick,
  rotulo,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo}
      className={cn(
        'grid size-7 place-items-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg',
        ativo && 'bg-brand-tint text-brand-ink',
      )}
    >
      {children}
    </button>
  );
}
