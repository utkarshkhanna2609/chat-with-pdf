import { PineconeRecord, Pinecone, RecordMetadata } from "@pinecone-database/pinecone";
import { FileKey } from "lucide-react";
import { downloadFromS3 } from "../s3-server";
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Document, RecursiveCharacterTextSplitter } from '@pinecone-database/doc-splitter'
import { getEmbeddings } from "../embeddings";
import md5 from "md5";
import { convertToAscii } from "../utils";

//let pinecone: PineconeClient | null = null;

export const getPineconeClient = () => {
    return new Pinecone({
      environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });
  };

type PDFPage = {
    pageContent: string;
    metadata: {
        loc: { pageNumber: number }
    }
}
export async function loadS3toPineCone(fileKey: string) {
    // 1. obtain the pdf
    console.log("downloading s3 into file system");
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
        throw new Error("could not download from s3");
    }
    console.log("loading pdf into memory" + file_name);
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];

    // 2. split and segment the pdf
    const documents = await Promise.all(pages.map(prepareDocument));

    // 3. vectorise and embed individual documents
    const vectors = (await Promise.all(documents.flat().map(embedDocument))).filter(Boolean) as PineconeRecord<RecordMetadata>[];

    // Add metadata as an alternative to namespaces
    // Add the namespace as a metadata key-value pair
    const namespace = convertToAscii(fileKey);
    vectors.forEach(vector => {
        if (vector && vector.metadata) {
            vector.metadata.namespace = namespace;
        }
    });

    // 4. upload to pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index("chat-with-pdf");

    console.log("inserting vectors into pinecone");
    await pineconeIndex.upsert(vectors);

    return documents[0];
}


async function embedDocument(doc: Document) {
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
        } as PineconeRecord;
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