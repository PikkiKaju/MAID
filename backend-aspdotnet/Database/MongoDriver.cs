using MongoDB.Bson;
using MongoDB.Driver;
using System;

namespace backend_aspdotnet.Database
{
    public class MongoDriver
    {
        private readonly IMongoDatabase _database;
        private readonly IMongoCollection<BsonDocument> _collection;

        public MongoDriver()
        {

            var connectionString = "mongodb://admin:secret@127.0.0.1:27017/?authSource=admin";

            var client = new MongoClient(connectionString);
            var database = client.GetDatabase("testdb");
            var collection = database.GetCollection<BsonDocument>("testcollection");

            var doc = new BsonDocument { { "name", "Test User" }, { "createdAt", DateTime.UtcNow } };
            collection.InsertOne(doc);

            Console.WriteLine("✅ Connected and inserted.");

        }

        public void InsertSampleDocument()
        {
            var document = new BsonDocument
            {
                { "name", "John Doe" },
                { "age", 30 },
                { "createdAt", DateTime.UtcNow }
            };

            _collection.InsertOne(document);
        }

        public BsonDocument FindDocumentByName(string name)
        {
            var filter = Builders<BsonDocument>.Filter.Eq("name", name);
            return _collection.Find(filter).FirstOrDefault();
        }
    }
}
