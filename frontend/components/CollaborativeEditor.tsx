import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export default function CollaborativeEditor({ moduleId }: { moduleId: string }) {
  const [status, setStatus] = useState('connecting...');
  const [ydoc] = useState(() => new Y.Doc());

  useEffect(() => {
    // Connect to our backend Yjs websocket server
    const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:5000';
    
    // We attach it to the /yjs path
    const wsProvider = new WebsocketProvider(
      `${wsUrl}/yjs`,
      `module-spec-${moduleId}`,
      ydoc
    );

    wsProvider.on('status', (event: { status: string }) => {
      setStatus(event.status);
    });

    return () => {
      wsProvider.destroy();
    };
  }, [moduleId, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // History is handled by Yjs
      }),
      Collaboration.configure({
        document: ydoc,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
      },
    },
  });

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-8 shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Module Specification (Live Sync)</span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-widest ${
          status === 'connected' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'
        }`}>
          {status}
        </span>
      </div>
      <div className="p-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
