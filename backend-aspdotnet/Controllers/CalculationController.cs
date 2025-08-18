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
        public List<List<double>> X { get; set; }  // changed
        public List<double> y { get; set; }
        public List<double> predict { get; set; }
    }



    [ApiController]
    [Route("api/[controller]")]
    public class CalculationController : ControllerBase
    {

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

            // Get dataset info from Mongo using project.DatasetId
            var rawDataset = mongoDb.Datasets.Find(d => d.Id == project.DatasetId).FirstOrDefault();
            if (rawDataset == null)
                return NotFound("Dataset not found in MongoDB");

            // Get project details from Mongo
            var projectDetails = mongoDb.ProjectDetails.Find(p => p.Id == project.Id).FirstOrDefault();
            if (projectDetails == null)
                return NotFound("Project details not found in MongoDB");

            // Prepare BaseRegressionDTO
            List<double> xValues = rawDataset.Data[projectDetails.XColumn]
    .Select(s => double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : (double?)null)
    .Where(d => d.HasValue)
    .Select(d => d.Value)
    .ToList();
            List<double> yValues = rawDataset.Data[projectDetails.YColumn]
  .Select(s => double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : (double?)null)
  .Where(d => d.HasValue)
  .Select(d => d.Value)
  .ToList();

            xValues = new List<double> {2,4,5,7,8,9};
            yValues = new List<double> { 1, 2, 3, 4, 5, 6 };

            var reshapedX = xValues.Select(x => new List<double> { x }).ToList();

            var input = new RegressionInput
            {
                X = reshapedX, // List<List<double>>
                y = yValues,
                predict = new List<double> { 10, 15 }
            };

            Console.WriteLine(input.ToString());    

            var pythonService = new PythonConectService();
            var responseJson = await pythonService.SendDataAsync(input, projectDetails.Algorithm);

            if (string.IsNullOrEmpty(responseJson))
                return StatusCode(500, "Failed to get response from Python service.");

            var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson);

            return Ok(responseData);
        }

    }
}
