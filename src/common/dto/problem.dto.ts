import { ApiProperty } from '@nestjs/swagger';

export class Problem {
  @ApiProperty({
    type: String,
    format: 'uri',
    description: 'URI identifying the problem type',
    example: 'https://example.com/problems/invalid-cursor',
  })
  declare type: string;

  @ApiProperty({
    type: String,
    description: 'Short summary of the problem type',
    example: 'Invalid pagination cursor',
  })
  declare title: string;

  @ApiProperty({
    type: 'integer',
    minimum: 400,
    maximum: 599,
    description: 'HTTP status code of this response',
    example: 400,
  })
  declare status: number;

  @ApiProperty({
    type: String,
    description: 'Explanation specific to this occurrence of the problem',
    example: 'The cursor contains an unsupported version.',
  })
  declare detail: string;

  @ApiProperty({
    type: String,
    format: 'uri-reference',
    description: 'URI reference identifying this occurrence of the problem',
    example: '/events?cursor=invalid',
  })
  declare instance: string;
}
