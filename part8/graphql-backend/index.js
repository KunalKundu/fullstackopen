require('dotenv').config()

const { ApolloServer, gql } = require('apollo-server')
const mongoose = require('mongoose')

const Author = require('./models/author')
const Book = require('./models/book')

mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)
mongoose.set('useNewUrlParser', true)

const MONGODB_URI = process.env.MONGODB_URI

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('connected to MongoDB')
    })
    .catch((error) => {
        console.log('error connection to MongoDB:', error.message)
    })

const typeDefs = gql`
type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
}

type Book {
    title: String!
    published: Int
    author: Author!
    id: ID!
    genres: [String]!
}

type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(genre: String): [Book!]!
    allAuthors: [Author!]!
}

type Mutation {
    addBook(
        title: String!
        published: Int
        author: String!
        genres: [String]!
    ) : Book
    editAuthor(
        name: String!
        setBornTo: Int!
    ) : Author
}
`

const resolvers = {
    Query: {
        bookCount: () => Book.collection.countDocuments(),
        authorCount: () => Author.collection.countDocuments(),
        allBooks: (root, args) => Book.find(!args.genre ? {} : { genres: args.genre }),
        allAuthors: () => Author.find({})
    },
    Book: {
        author: (root) => Author.findById(root.author)
    },
    Author: {
        bookCount: (root) => Book.find({ author: root.id }).length
    },
    Mutation: {
        addBook: async (root, args) => {
            const search = await Author.find({ name: args.author })

            const author = search.length ? search[0] : await (new Author({ name: args.author })).save()
            const book = new Book({ ...args, author: author._id })

            try {
                await book.save()
            }
            catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args,
                })
            }

            return book
        },
        editAuthor: async (root, args) => {
            const author = Author.findOne({ name: args.name })
            author.born = args.setBornTo

            try {
                await author.save()
            }
            catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args,
                })
            }

            return author
        }
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
})

server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`)
})