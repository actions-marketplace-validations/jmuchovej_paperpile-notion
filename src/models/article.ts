/* eslint-disable camelcase */
import {
  CMSPage,
  getPageTitle,
  getPropertyValue,
  PageWithChildren,
  richTextAsPlainText,
} from "@jitl/notion-api"
import {
  Database,
  makeMultiSelect,
  makeRelation,
  makeRichText,
  makeSelect,
  makeTitle,
  makeURL,
  MultiSelect,
  Notion,
  Relation,
  RichText,
  Select,
  Title,
  URL,
} from "../notion"
import * as path from "node:path"
import * as _ from "lodash"
import {AuthorIndex} from "./author";
import {ConfigInterface} from "../config";

export class ArticlesDatabase extends Database<ArticleFrontmatter> {
  constructor(id: string, cacheDir: string) {
    super(CMSConfig, id, cacheDir)
  }
}

export type ArticleFrontmatter = {
  authors: Relation
  ID: RichText,
  plain: {
    title: string,
    ID: string,
  }
}

export type ArticlePage = CMSPage<ArticleFrontmatter>;

// @ts-ignore
const getFrontmatter = (page: PageWithChildren) => {
  // const blocks = await getChildBlocks(Notion, page.id)
  const title = getPageTitle(page)
  // TOOD this needs to be changed based on whether there's an Author's database
  const authors = getPropertyValue(page, {name: `Authors`, type: `relation`})
  const ID = getPropertyValue(page, {name: `ID`, type: `rich_text`})

  const plain = {
    title: richTextAsPlainText(title).trim(),
    ID: richTextAsPlainText(ID).trim(),
  }

  // TODO gather child block lengths
  return {plain, authors, ID, pageID: page.id}
}

export const CMSConfig = (cacheDir: string, databaseID: string) => {
  return {
    database_id: databaseID,
    getFrontmatter,
    notion: Notion,
    visible: true,
    // slug: "ID",
    cache: {
      directory: path.join(cacheDir, `articles`),
    },
    assets: {
      directory: path.join(cacheDir, `articles/assets`),
      downloadExternalAssets: true,
    },
  }
}

export type ArticleEntry = any


type NotionEntry = {
  Title: Title,
  ID: RichText,
  Status: Select,
  Authors?: MultiSelect | Relation,
  Topics?: MultiSelect,
  Fields?: MultiSelect,
  Methods?: MultiSelect,
  Keywords?: MultiSelect,
  Folders?: MultiSelect,
  Venue?: Select,
  URL?: URL,
}

export const BibTeXToNotion = (bib: ArticleEntry) => {
  const ID = makeRichText(bib.id) as RichText
  const Title = makeTitle(bib.title)
  const Status = makeSelect(bib.status) ?? makeSelect("❓ Unknown")

  const Authors = makeRelation(bib.authors) ?? makeMultiSelect(bib.authors)
  const Topics = makeMultiSelect(bib.topics)
  const Fields = makeMultiSelect(bib.fields)
  const Methods = makeMultiSelect(bib.methods)
  const Folders = makeMultiSelect(bib.folders)
  const Keywords = makeMultiSelect(bib.keywords)
  const Venue = makeSelect(bib["container-title"])
  const URL = makeURL(bib.url)

  if (!(ID && Title && Status)) {
    console.log(bib.id, bib.title, bib.status)
    console.log(bib, ID, Title, Status)
    return
  }

  let Entry: NotionEntry = {ID, Title, Status}
  Entry = Authors ? {...Entry, Authors} : Entry
  Entry = Topics ? {...Entry, Topics} : Entry
  Entry = Fields ? {...Entry, Fields} : Entry
  Entry = Methods ? {...Entry, Methods} : Entry
  Entry = Keywords ? {...Entry, Keywords} : Entry
  Entry = Folders ? {...Entry, Folders} : Entry
  Entry = Venue ? {...Entry, Venue} : Entry
  Entry = URL ? {...Entry, URL} : Entry
  // console.log(Entry)

  return Entry
}

export const initArticleDB = async (articleDbID: string, cacheDir: string) => {
  const articles = new ArticlesDatabase(articleDbID, cacheDir)
  await articles.setupDB()
  const notion = await articles.downloadDB("ID")

  return {db: articles, notion}
}

export const prepareBibTeXForNotion = (bibEntry: any, authorIndex: AuthorIndex, config: ConfigInterface) => {
  bibEntry.status = _.isNil(bibEntry.status) ? undefined : config.status.states[bibEntry.status]

  if (config.databases.authors && !_.isNil(bibEntry.authors)) {
    bibEntry.authors = bibEntry.authors?.map((author: string) => {
      try {
        return {id: authorIndex[author].frontmatter.pageID}
      } catch (error: unknown) {
        console.log(author, error)
      }
    })
  }
  bibEntry.authors = bibEntry.authors?.filter((a: any) => a)

  return bibEntry
}
