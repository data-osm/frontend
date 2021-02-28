import { Component, OnInit } from '@angular/core';
import { ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-details-vector-provider',
  templateUrl: './details-vector-provider.component.html',
  styleUrls: ['./details-vector-provider.component.scss']
})
export class DetailsVectorProviderComponent implements OnInit {

  provider_vector_id: number

  constructor(
    private route: ActivatedRoute,
  ) {
    this.provider_vector_id = Number(this.route.snapshot.paramMap.get('id'))
  }

  ngOnInit(): void {
  }


}
