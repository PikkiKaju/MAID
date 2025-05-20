using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace backend_aspdotnet.Database
{
    public class Elelemt
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("Name")]
        public string Name { get; set; }

        [BsonElement("x")]
        public int X { get; set; }
    }
}
