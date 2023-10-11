'use client'
import React from 'react'
import { Inbox } from 'lucide-react';
import {useDropzone} from 'react-dropzone';
import { getS3Url, uploadToS3 } from '@/lib/s3';

const FileUpload = () => {
    const {getRootProps, getInputProps} = useDropzone({
        accept: { "application/pdf": [".pdf"] },
        maxFiles:1,
        onDrop: async (acceptedFiles)=>{
            console.log(acceptedFiles);
            const file=acceptedFiles[0]
            if(file.size>10*1024*1024){
                alert('please upload file<10MB');
            }
            try{
                const data=uploadToS3(file)
                console.log(data);
            }catch(error){
                console.log(error);
            }
        }

    });
    return (
        <div className='p-2 bg-white rounded-xl'>
            <div
                {
                    ...getRootProps({
                        className:"border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col"
                    })
                }>
                <input {...getInputProps()}/>
                <>
                <Inbox className='w-10 h-10 text-blue-500'/>
                <p className='text-md text-center text-gray-500'>Drop PDF here</p>
                </>
                
            </div>
        </div>
    )
}

export default FileUpload;