using backend_aspdotnet.Database;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using backend_aspdotnet.Models;
using System.Collections.Generic;
using MongoDB.Driver;
using System.Data;
using MongoDB.Bson;

using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Bson;
using Microsoft.OpenApi.Models;
using backend_aspdotnet.Helpers;

BsonSerializer.RegisterSerializer(new GuidSerializer(GuidRepresentation.Standard));

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Your API", Version = "v1" });
    c.OperationFilter<FileUploadOperationFilter>();
    // Define the JWT Bearer security scheme
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your valid token.\n\nExample: \"Bearer abc123token\""
    });

    // Require Bearer token globally (all endpoints)
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference= new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
    
});


builder.Services.AddHttpClient<PythonConectService>();
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<ElementDBConterxt>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// JWT Authentication setup
var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
var postgresConnectionString = builder.Configuration.GetValue<string>("PostgreSQL:ConnectionString");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(postgresConnectionString));


var app = builder.Build();



// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(
    );
}
else
{
    app.UseHttpsRedirection();
}


using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<AuthService>();
    var mongoContext = scope.ServiceProvider.GetRequiredService<ElementDBConterxt>();

    db.Database.EnsureCreated();

    if (!db.Users.Any())
    {
        var users = new List<User>
        {
            new User { Id = Guid.NewGuid(), Username = "Adam", Email = "adam@example.com", Password = authService.HashPassword("Adam") },
            new User { Id = Guid.NewGuid(), Username = "Dominik", Email = "dominik@example.com", Password = authService.HashPassword("Dominik") },
            new User { Id = Guid.NewGuid(), Username = "Martyna", Email = "martyna@example.com", Password = authService.HashPassword("Martyna") },
            new User { Id = Guid.NewGuid(), Username = "Kuba", Email = "kuba@example.com", Password = authService.HashPassword("Kuba") },
            new User { Id = Guid.NewGuid(), Username = "Rafa³", Email = "rafa³@example.com", Password = authService.HashPassword("Rafa³") },
            new User { Id = Guid.NewGuid(), Username = "Micha³", Email = "micha³@example.com", Password = authService.HashPassword("Micha³") },
            new User { Id = Guid.NewGuid(), Username = "Admin", Email = "admin@example.com", Password = authService.HashPassword("Admin"), Role = "Admin" }
        };

        db.Users.AddRange(users);
        db.SaveChanges();

        var datasets = new List<DatasetMeta>
        {
            new DatasetMeta { Id = Guid.NewGuid(), Name = "Sample Dataset", UserId = users[0].Id, CreatedAt = DateTime.UtcNow },
            new DatasetMeta { Id = Guid.NewGuid(), Name = "Sample Dataset 2", UserId = users[0].Id, CreatedAt = DateTime.UtcNow },
            new DatasetMeta { Id = Guid.NewGuid(), Name = "Sample Dataset", UserId = users[1].Id, CreatedAt = DateTime.UtcNow },
            new DatasetMeta { Id = Guid.NewGuid(), Name = "Sample Dataset 2", UserId = users[1].Id, CreatedAt = DateTime.UtcNow },
            new DatasetMeta { Id = Guid.NewGuid(), Name = "Sample Dataset", UserId = users[2].Id, CreatedAt = DateTime.UtcNow },
            new DatasetMeta { Id = Guid.NewGuid(), Name = "Sample Dataset 2", UserId = users[2].Id, CreatedAt = DateTime.UtcNow }
        };

        db.Datasets.AddRange(datasets);

        var projects = new List<ProjectMeta>
        {
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Przewidywanie pogody", UserId = users[0].Id, DatasetId = datasets[0].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = true, Likes = 1 },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Regresja interesuj¹cych danych", UserId = users[1].Id, DatasetId = datasets[2].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow ,IsPublic = true, Likes = 4},
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt startowy", UserId = users[2].Id, DatasetId = datasets[4].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = true },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt pocz¹tkowy", UserId = users[0].Id, DatasetId = datasets[0].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = true , Likes = 2},
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt nr 4", UserId = users[1].Id, DatasetId = datasets[2].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow ,IsPublic = true, Likes = 5},
            new ProjectMeta { Id = Guid.NewGuid(), Name = "My project", UserId = users[2].Id, DatasetId = datasets[4].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = false },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Przewidywanie cen pr¹du", UserId = users[0].Id, DatasetId = datasets[0].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = false },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Przewidywanie wartoœci z³ota", UserId = users[1].Id, DatasetId = datasets[2].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow ,IsPublic = true},
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[2].Id, DatasetId = datasets[4].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = true, Likes = 3 },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[0].Id, DatasetId = datasets[0].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = false },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[1].Id, DatasetId = datasets[2].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow ,IsPublic = false},
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[2].Id, DatasetId = datasets[4].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow,IsPublic = false }
        };

        db.Projects.AddRange(projects);
        db.SaveChanges();

        var blocked = new List<Blocked>
        {
        };

        db.Blocked.AddRange(blocked);
        db.SaveChanges();

        var like = new List<Like>
        {
            new Like { Id = Guid.NewGuid(), UserId = users[3].Id, ProjectId = projects[0].Id },
            //
            new Like { Id = Guid.NewGuid(), UserId = users[3].Id, ProjectId = projects[1].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[2].Id, ProjectId = projects[1].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[1].Id, ProjectId = projects[1].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[0].Id, ProjectId = projects[1].Id },
            //
            new Like { Id = Guid.NewGuid(), UserId = users[3].Id, ProjectId = projects[3].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[3].Id, ProjectId = projects[3].Id },
            //
            new Like { Id = Guid.NewGuid(), UserId = users[0].Id, ProjectId = projects[4].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[1].Id, ProjectId = projects[4].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[2].Id, ProjectId = projects[4].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[3].Id, ProjectId = projects[4].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[4].Id, ProjectId = projects[4].Id },
            //
            new Like { Id = Guid.NewGuid(), UserId = users[0].Id, ProjectId = projects[8].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[1].Id, ProjectId = projects[8].Id },
            new Like { Id = Guid.NewGuid(), UserId = users[2].Id, ProjectId = projects[8].Id },
        };

        db.Likes.AddRange(like);
        db.SaveChanges();

        if (!mongoContext.ProjectDetails.AsQueryable().Any())
        {
            var mongoProjectDetails = projects.Select(p => new ProjectDetails
            {
                Id = p.Id, 
                XColumn = "X",
                YColumn = "Y",
                Algorithm = "Linear",
                Parameters = new Dictionary<string, string> { { "alpha", "0.01" } }
            });

            mongoContext.ProjectDetails.InsertMany(mongoProjectDetails);
        }

        if (!mongoContext.Datasets.AsQueryable().Any())
        {
            var mongoDatasets = datasets.Select(d => new RawDataset
            {
                Id = d.Id, 
                Columns = new List<string> { "X", "Y" },
                Data = new Dictionary<string, List<string>>
                {
                    { "X", new List<string> { "1", "2", "3" } },
                    { "Y", new List<string> { "2", "4", "6" } }
                }
            });

            mongoContext.Datasets.InsertMany(mongoDatasets);
        }
    }
}

// WA¯NE: app.UseRouting() musi byæ przed app.UseCors() jeœli u¿ywasz routingu atrybutowego
app.UseRouting();

// WA¯NE: Tutaj wstawiasz app.UseCors()
app.UseCors(); // To aktywuje domyœln¹ politykê CORS


app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
