import {OpenAIApi, Configuration} from 'openai-edge';

const config= new Configuration({
    apiKey:process.env.OPENAI_API_KEY,

})

const openai=new OpenAIApi(config)

export async function getEmbeddings(text:string) {
    try{
        const response=await openai.createEmbedding({
            model:'text-embedding-ada-002',
            input:text.replace(/\n/g,'')
        });
        const result=await response.json();
        if (result && result.data && result.data[0]) {
            return result.data[0].embedding as number[];
        } else {
            console.error("Unexpected response format:", result);
            throw new Error("Unexpected response format from OpenAI API");
        }
        
    }
    catch(error){
        console.log(error);
        throw(error);
    }
}