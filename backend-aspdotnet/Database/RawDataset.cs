using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;

namespace backend_aspdotnet.Database
{
    public class RawDataset
    {
        [BsonId]
        public Guid Id { get; set; }

        [BsonElement("columns")]
        public List<string> Columns { get; set; }

        [BsonElement("data")]
        public Dictionary<string, List<string>> Data { get; set; }
    }

}
