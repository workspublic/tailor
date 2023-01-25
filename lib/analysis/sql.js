export default {
  parcels: (buildingParcelOverlapSqFt) => {
    const buildingParcelOverlapSqM = buildingParcelOverlapSqFt * 0.092903;

    return `
      create table parcels_analyzed as
      with buildings_with_bsl as (
        select bu.geom
        from buildings bu
        join bsls bs on st_intersects(bu.geom, bs.geom)
        group by bu.geom
      ), parcels_with_building_with_bsl as (
        select p.ogc_fid
        from parcels p
        join buildings_with_bsl bwb on
          st_intersects(p.geom, bwb.geom) and
          st_area(st_intersection(p.geom, bwb.geom)::geography) > ${buildingParcelOverlapSqM}
        group by p.ogc_fid
      ), parcels_with_bsl as (
        select p.ogc_fid
        from parcels p
        join bsls b on st_intersects(p.geom, b.geom)
        group by p.ogc_fid
      ), parcels_with_building as (
        select p.ogc_fid
        from parcels p
        join buildings b on
          st_intersects(p.geom, b.geom) and
          st_area(st_intersection(p.geom, b.geom)::geography) > ${buildingParcelOverlapSqM}
        group by p.ogc_fid
      )
      select
        p.*,
        (pbu.ogc_fid is not null) as has_building,
        (pbb.ogc_fid is not null or pbs.ogc_fid is not null) as has_bsl,
        pbu.ogc_fid as pbu,
        pbs.ogc_fid as pbs
      from parcels p
      left join parcels_with_building_with_bsl pbb on p.ogc_fid = pbb.ogc_fid
      left join parcels_with_bsl pbs on p.ogc_fid = pbs.ogc_fid
      left join parcels_with_building pbu on p.ogc_fid = pbu.ogc_fid
      ;
    `;
  },
  bsls: (tailorAddressColumn) => {
    let bslAddressColumn;

    if (tailorAddressColumn === 'tailor_address_street') {
      bslAddressColumn = 'address_primary_norm';
    } else if (tailorAddressColumn === 'tailor_address_full') {
      bslAddressColumn = 'address_full_norm';
    } else {
      throw new Error(
        `Unrecognized address match column: ${tailorAddressColumn}`
      );
    }

    return `
      create table bsls_analyzed as
      select
        b.*,
        (a.${tailorAddressColumn} is not null) as is_known_address,
        st_length(st_makeline(a.geom, b.geom)::geography) * 3.28084 as distance_to_known_address
      from bsls b
      left join addresses a on a.${tailorAddressColumn} = b.${bslAddressColumn}
      ;
    `;
  },
  // TODO lateral join and order by distance
  addressMatchLines: (tailorAddressColumn) => {
    let bslAddressColumn;

    if (tailorAddressColumn === 'tailor_address_street') {
      bslAddressColumn = 'address_primary_norm';
    } else if (tailorAddressColumn === 'tailor_address_full') {
      bslAddressColumn = 'address_full_norm';
    } else {
      throw new Error(
        `Unrecognized address match column: ${tailorAddressColumn}`
      );
    }

    return `
      create table bsls_address_match_lines as
      with l as (
        select 
          b.location_id,
          b.${bslAddressColumn},
          closest_a.${tailorAddressColumn} as match_address,
          st_makeline(closest_a.geom, b.geom) as geom
        from bsls b,
        lateral (
          select
            a.${tailorAddressColumn},
            a.geom
          from addresses a
          where a.${tailorAddressColumn} = b.${bslAddressColumn}
          order by st_distance(a.geom, b.geom)
          limit 1
        ) closest_a
      )
      select
        *,
        st_length(geom) * 3.28084 as distance_ft
      from l
      ;
    `;
  },
};
