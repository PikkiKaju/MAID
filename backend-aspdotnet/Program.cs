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


var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

// Restrict /calculation to port 5050
app.Use(async (context, next) =>
{
    var localPort = context.Connection.LocalPort;
    if (context.Request.Path.StartsWithSegments("/api/calculation") && localPort != 5050)
    {
        context.Response.StatusCode = 403;
        await context.Response.WriteAsync("This API is not available.");
        return;
    }

    await next();
});


// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
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
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[0].Id, DatasetId = datasets[0].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[1].Id, DatasetId = datasets[2].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow },
            new ProjectMeta { Id = Guid.NewGuid(), Name = "Projekt", UserId = users[2].Id, DatasetId = datasets[4].Id, CreatedAt = DateTime.UtcNow, LastModifiedAt = DateTime.UtcNow }
        };

        db.Projects.AddRange(projects);
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


app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
