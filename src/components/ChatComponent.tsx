'use client'
import React from "react";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import {Message} from 'ai';
import axios from "axios";

type Props={chatId:number}

const ChatComponent = ({chatId}: Props) => {
    
  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
    
  });
  return (
    <div className="relative h-screen overflow-scroll bg-slate-200">
      <div className="sticky inset-x-0 p-2 flex h-fit">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>
      <MessageList messages={messages}/>
      
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 inset-x-0 px-2 py-4 bg-slate-200"
      >
        <div className="flex">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask any question..."
            className="h-15 w-full mt-2"
          />
          <Button className="h-15 bg-blue-600 ml-2">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
      
    </div>
  );
};

export default ChatComponent;
