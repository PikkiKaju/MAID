using MongoDB.Driver;

namespace backend_aspdotnet.Database
{
    
    public class ElementDBConterxt
    {
       

        private readonly IMongoDatabase _database;
        private readonly IConfiguration _configuration;

        public ElementDBConterxt(IConfiguration configuration)
        {
            _configuration = configuration;
            string conectionString = _configuration.GetConnectionString("DefaultConnection")!;
            string databaseName = _configuration.GetSection("MongoDB:DatabaseName").Value!;
            var client = new MongoClient(conectionString);
            _database = client.GetDatabase(databaseName);
        }

        public IMongoCollection<RawDataset> Datasets=>
            _database.GetCollection<RawDataset>(_configuration.GetSection("MongoDB:CollectionName").Value!);

        public IMongoCollection<ProjectDetails> ProjectDetails =>
            _database.GetCollection<ProjectDetails>("ProjectDetails");
        
        public IMongoDatabase GetDatabase() => _database;

    }
}
