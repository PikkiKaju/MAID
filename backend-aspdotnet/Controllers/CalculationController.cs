using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Globalization;
using System.Security.Claims;
using System.Text.Json;

namespace backend_aspdotnet.Controllers
{
    public class RegressionInput
    {
        public List<List<double>> X { get; set; }
        public List<double> y { get; set; }
        public Dictionary<string, string> parameters { get; set; } = new();
    }



    [ApiController]
    [Route("api/[controller]")]
    public class CalculationController : ControllerBase
    {
        private readonly DatasetService _datasetService;

        public CalculationController(DatasetService datasetService)
        {
            _datasetService = datasetService;
        }

        [Authorize]
        [HttpPost("start")]
        public async Task<IActionResult> LinearRegression([FromBody] Guid projectId, [FromServices] AppDbContext db, [FromServices] ElementDBConterxt mongoDb)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            // Get project from Postgres
            var project = db.Projects.FirstOrDefault(p => p.Id == projectId && p.UserId == userId);
            if (project == null)
                return NotFound("Project not found or not authorized");

            // Get project details from Mongo
            var projectDetails = mongoDb.ProjectDetails.Find(p => p.Id == project.Id).FirstOrDefault();
            if (projectDetails == null)
                return NotFound("Project details not found in MongoDB");

            List<List<double>> xValues;
            if (projectDetails.X2Column == string.Empty || projectDetails.X2Column == null)
            {
                List<double> x1Values = _datasetService.GetCsvNumericColumnAsync(project.DatasetId, projectDetails.XColumn).Result.ToList();
                xValues= x1Values.Select(x => new List<double> { x }).ToList();
            }
            else
            {
                List<double> x1Values = (await _datasetService.GetCsvNumericColumnAsync(project.DatasetId, projectDetails.XColumn)).ToList();

                List<double> x2Values = (await _datasetService.GetCsvNumericColumnAsync(project.DatasetId, projectDetails.X2Column)).ToList();
                xValues = x1Values.Zip(x2Values, (x1, x2) => new List<double> { x1, x2 }).ToList();
            }
                
            List<double> yValues = _datasetService.GetCsvNumericColumnAsync(project.DatasetId, projectDetails.YColumn).Result.ToList();



            var input = new RegressionInput
            {
                X = xValues, // List<List<double>>
                y = yValues,
                parameters = projectDetails.Parameters

            };

            Console.WriteLine(input.ToString());    

            var pythonService = new PythonConectService();
            var responseJson = await pythonService.SendDataAsync(input, projectDetails.Algorithm);

            if (string.IsNullOrEmpty(responseJson))
                return StatusCode(500, "Failed to get response from Python service.");

            var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson);

            mongoDb.ProjectDetails.UpdateOne(
                p => p.Id == project.Id,
                Builders<ProjectDetails>.Update.Set(p => p.Results, responseData!.ToDictionary(k => k.Key, k => k.Value.ToString() ?? ""))
            );

            return Ok(responseData);
        }

    }
}
