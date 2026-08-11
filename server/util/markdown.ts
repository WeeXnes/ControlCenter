import Shiki from '@shikijs/markdown-it'
import MarkdownIt from 'markdown-it'

let md: MarkdownIt;

const initializeShikiMarkdown = async () => {
    if(!md){
        md = MarkdownIt()

        const theme = 'houston'

        md.use(await Shiki({
            themes: {
                light: theme,
                dark: theme,
            },
            fallbackLanguage: "c"
        }))
    }else{
        console.log("Markdown already initialized.");
    }
}

export { md, initializeShikiMarkdown };


