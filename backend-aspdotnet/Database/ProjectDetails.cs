using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace backend_aspdotnet.Database
{
    public class ProjectDetails
    {
        [BsonId]
        public Guid Id { get; set; }

        public string XColumn { get; set; } = string.Empty;
        public string YColumn { get; set; } = string.Empty;
        public string Algorithm { get; set; } = string.Empty;
        public Dictionary<string, string> Parameters { get; set; } = new();
    }
}
