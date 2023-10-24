'use client'

import { uploadToS3 } from "@/lib/s3";
import { Inbox, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";

const createChat = async ({ file_key, file_name }: { file_key: string; file_name: string }) => {
  const response = await axios.post("/api/create-chat", {
    file_key,
    file_name,
  });
  return response.data;
};

const FileUpload = () => {
 // const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);

  const onDrop = async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const file = acceptedFiles[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large");
      return;
    }

    try {
      setUploading(true);
      const data = await uploadToS3(file);
      if (!data?.file_key || !data.file_name) {
        toast.error("Something went wrong");
        return;
      }
      setLoading(true);
      const response = await createChat(data);
      setChatId(response.chat_id);
      toast.success("Chat created!");
    } catch (error) {
      
      toast.error("Error creating chat");
      console.error(error);
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop,
  });

  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            "border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col",
        })}
      >
        <input {...getInputProps()} />
        {uploading || loading ? (
          <>
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-slate-400">Spilling Tea to GPT...</p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">Drop PDF Here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
