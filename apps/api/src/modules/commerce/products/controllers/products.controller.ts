import {
  Controller,
  Get,
  HttpStatus,
  Param,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  ProductsService,
  ProductResponse,
} from "../services/products.service";

@ApiTags("Commerce & Products")
@ApiBearerAuth()
@Controller("commerce/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List all active store products and packages" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of available store products with prices and durations",
  })
  async getProducts(): Promise<ProductResponse[]> {
    return this.productsService.getProducts();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get details for a specific store product" })
  @ApiParam({ name: "id", description: "ID of the product" })
  @ApiResponse({ status: HttpStatus.OK, description: "Product details" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Product not found" })
  async getProductById(@Param("id") id: string): Promise<ProductResponse> {
    return this.productsService.getProductById(id);
  }
}
