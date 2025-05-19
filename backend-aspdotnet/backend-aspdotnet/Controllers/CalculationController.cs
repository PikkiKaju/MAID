using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CalculationController : ControllerBase
    {
 

        [HttpPost("linear")]
        public async Task<IActionResult> LinearRegression([FromBody] BaseRegressionDTO input)
        {
            var pythonService = new PythonConectService();

            var responseJson = await pythonService.SendDataAsync(input);

            if (string.IsNullOrEmpty(responseJson))
            {
                return StatusCode(500, "Failed to get response from Python service.");
            }
            var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson);

            return Ok(responseData);
        }

        [HttpPost("ridge")]
        public async Task<IActionResult> RidgeRegression([FromBody] RidgeRegressionDTO input)
        {
            var pythonService = new PythonConectService();

            var responseJson = await pythonService.SendDataAsync(input);

            if (string.IsNullOrEmpty(responseJson))
            {
                return StatusCode(500, "Failed to get response from Python service.");
            }   
            var responseData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson);

            return Ok(responseData);
        }

    }
}
