namespace backend_aspdotnet.DTOs
{
    public class BaseRegressionDTO
    {
        public required List<double> X { get; set; }
        public required List<double> Y { get; set; }
        public required string Algorithm { get; set; }
    }
}
