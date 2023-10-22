import { PineconeClient, Vector,utils as PineconeUtils } from "@pinecone-database/pinecone";
import { FileKey } from "lucide-react";
import { downloadFromS3 } from "../s3-server";
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Document, RecursiveCharacterTextSplitter } from '@pinecone-database/doc-splitter'
import { splitCookiesString } from "next/dist/compiled/@edge-runtime/cookies";
import { getEmbeddings } from "../embeddings";
import md5 from "md5";
import { convertToAscii } from "../utils";

let pinecone: PineconeClient | null = null;

export const getPineconeClient = async () => {
    if (!pinecone) {
        pinecone = new PineconeClient()
        await pinecone.init({
            environment: process.env.PINECONE_ENVIRONMENT!,
            apiKey: process.env.PINECONE_API_KEY!,
        })
        return pinecone;
    }
}

type PDFPage = {
    pageContent: string;
    metadata: {
        loc: { pageNumber: number }
    }
}

export async function loadS3toPineCone(fileKey: string) {
    //obtain the pdf
    console.log("Downloading s3 to file system");
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
        throw new Error("could not download from s3");
    }
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];

    //split and segment it
    const documents = await Promise.all(pages.map(prepareDocument));

    //vectorise
    const vectors = await Promise.all((documents.flat() as unknown as Document[]).map(embedDocument));
    const filteredVectors = vectors.filter(vector => vector !== undefined) as Vector[];

    //upload to pineconeDB
    const client = await getPineconeClient();
    const pineconeIndex = client?.Index('chat-with-pdf');
    console.log('inserting embeddings');
    const namespace = convertToAscii(fileKey);
    if (pineconeIndex) {
        PineconeUtils.chunkedUpsert(pineconeIndex, filteredVectors, namespace, 10);
    } else {
        console.error("Pinecone index not initialized!");
        // Handle the error case as appropriate for your application.
    }   
}

async function embedDocument(doc: Document): Promise<Vector | undefined> {
    try {
        const embeddings = await getEmbeddings(doc.pageContent);
        const hash = md5(doc.pageContent);
        return {
            id: hash,
            values: embeddings,
            metadata: {
                text: doc.metadata.text,
                pageNumber: doc.metadata.pageNumber
            }
        } as Vector;
    } catch (error) {
        console.error("Error embedding document:", error);
        return undefined;  // explicitly return undefined for clarity
    }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder();
    return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, bytes));
}

async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, "");
    const splitter = new RecursiveCharacterTextSplitter();
    return await splitter.splitDocuments([
        new Document({
            pageContent,
            metadata: {
                pageNumber: metadata.loc.pageNumber,
                text: truncateStringByBytes(pageContent, 36000)
            }
        })
    ]);
}